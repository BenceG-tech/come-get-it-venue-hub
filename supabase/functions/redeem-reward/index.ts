import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function redemptionCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `CGI-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'Server configuration error' }, 500);
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const rewardId = typeof body.reward_id === 'string' ? body.reward_id.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rewardId)) {
    return json({ error: 'INVALID_REWARD_ID' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const code = redemptionCode();
  const { data, error } = await admin.rpc('redeem_reward_atomic', {
    p_user_id: userData.user.id,
    p_reward_id: rewardId,
    p_redemption_code: code,
  });

  if (error) {
    const message = error.message || 'REDEMPTION_FAILED';
    if (message.includes('INSUFFICIENT_POINTS')) return json({ error: 'INSUFFICIENT_POINTS' }, 409);
    if (message.includes('REWARD_NOT_FOUND')) return json({ error: 'REWARD_NOT_FOUND' }, 404);
    if (message.includes('REWARD_INACTIVE')) return json({ error: 'REWARD_INACTIVE' }, 409);
    if (message.includes('REWARD_VENUE_INACTIVE')) return json({ error: 'REWARD_VENUE_INACTIVE' }, 409);
    if (message.includes('REWARD_EXPIRED')) return json({ error: 'REWARD_EXPIRED' }, 409);
    if (message.includes('REWARD_LIMIT_REACHED')) return json({ error: 'REWARD_LIMIT_REACHED' }, 409);
    console.error('[redeem-reward] Atomic redemption failed', error);
    return json({ error: 'REDEMPTION_FAILED' }, 500);
  }

  const result = (data ?? {}) as Record<string, unknown>;
  return json({ success: true, ...result });
});
