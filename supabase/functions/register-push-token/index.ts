import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const isExpoToken = (value: unknown): value is string => typeof value === 'string' && /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(value);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const bearer = req.headers.get('Authorization') ?? '';
    if (!bearer.startsWith('Bearer ')) return json({ error: 'UNAUTHORIZED' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(bearer.slice(7));
    if (authError || !user) return json({ error: 'UNAUTHORIZED' }, 401);
    const body = await req.json().catch(() => null);
    if (!body || !isExpoToken(body.token)) return json({ error: 'INVALID_PUSH_TOKEN' }, 400);
    const previousTokens = body.previous_tokens ?? (body.previous_token ? [body.previous_token] : []);
    if (!Array.isArray(previousTokens) || previousTokens.length > 100 || !previousTokens.every(isExpoToken))
      return json({ error: 'INVALID_PREVIOUS_TOKENS' }, 400);
    const allTokens = [...new Set([body.token, ...previousTokens])];
    // Every removal is scoped to the authenticated owner. Knowing a token cannot
    // unsubscribe somebody else's device.
    if (body.marketing_opt_in === false) {
      const { error } = await supabase.from('push_tokens').delete().eq('user_id', user.id).in('token', allTokens);
      if (error) throw error;
      return json({ success: true, enabled: false });
    }
    if (body.marketing_opt_in !== true) return json({ error: 'EXPLICIT_CONSENT_REQUIRED' }, 400);
    if (!['ios', 'android'].includes(body.platform)) return json({ error: 'INVALID_PLATFORM' }, 400);
    const { data: existing, error: readError } = await supabase.from('push_tokens')
      .select('marketing_consent_at').eq('user_id', user.id).eq('marketing_opt_in', true)
      .in('token', allTokens).order('marketing_consent_at').limit(1).maybeSingle();
    if (readError) throw readError;
    const { error } = await supabase.from('push_tokens').upsert({
      user_id: user.id, token: body.token, platform: body.platform,
      app_version: typeof body.app_version === 'string' ? body.app_version.slice(0, 40) : null,
      marketing_opt_in: true, marketing_consent_at: existing?.marketing_consent_at ?? new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'token' });
    if (error) throw error;
    const obsoleteTokens = previousTokens.filter(token => token !== body.token);
    if (obsoleteTokens.length) {
      const { error: removeError } = await supabase.from('push_tokens').delete()
        .eq('user_id', user.id).in('token', obsoleteTokens);
      if (removeError) throw removeError;
    }
    return json({ success: true, enabled: true });
  } catch {
    return json({ error: 'PUSH_PREFERENCE_SAVE_FAILED' }, 503);
  }
});
