import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { DEFAULT_LIMITS, DEFAULT_QUIET_HOURS, isQuietTime, validExpoToken, validateMessage, UUID } from './notification-policy.ts';

export const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-key, x-scheduler-key', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
export function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
export function database() {
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Server configuration unavailable');
  return createClient(url, key);
}
export type Database = ReturnType<typeof database>;
export async function schedulerReady(db: Database) {
  const { data, error } = await db.from('notification_scheduler_credentials').select('endpoint_url,enabled').eq('id', 'primary').single();
  return !error && !!data?.endpoint_url && data.enabled === true;
}
export async function authorizeScheduler(req: Request, db: Database) {
  const key = req.headers.get('x-scheduler-key');
  if (!key || !/^[a-f0-9]{64}$/.test(key)) return false;
  const { data, error } = await db.from('notification_scheduler_credentials').select('secret_hash,enabled,endpoint_url').eq('id', 'primary').single();
  if (error || !data?.enabled || !data.endpoint_url) return false;
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)));
  const hash = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  const expected = String(data.secret_hash);
  if (hash.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < hash.length; i++) mismatch |= hash.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}
export async function authorize(req: Request, db: Database, internal = false) {
  if (internal && req.headers.get('x-internal-key') === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return null;
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!jwt) throw new Error('Unauthorized');
  const { data: { user }, error } = await db.auth.getUser(jwt);
  if (error || !user) throw new Error('Unauthorized');
  const { data: profile, error: profileError } = await db.from('profiles').select('is_admin').eq('id', user.id).single();
  if (profileError || !profile?.is_admin) throw new Error('Admin access required');
  return user.id;
}
export function failure(error: unknown) {
  const message = error instanceof Error ? error.message : 'A művelet sikertelen.';
  return json({ success: false, error: message }, message === 'Unauthorized' ? 401 : message === 'Admin access required' ? 403 : 400);
}
export async function stableId(key: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)));
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const h = [...bytes.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export type SendInput = {
  user_id: string; title: string; body: string; template_id?: string; request_id?: string;
  deep_link?: string; sent_by?: string | null;
  quiet_hours?: typeof DEFAULT_QUIET_HOURS; frequency_limit?: typeof DEFAULT_LIMITS;
};
export async function deliverNotification(db: Database, input: SendInput, fetcher: typeof fetch = fetch, now = new Date()) {
  validateMessage(input.title, input.body, input.deep_link);
  if (!UUID.test(input.user_id)) throw new Error('Érvénytelen címzett.');
  if (isQuietTime(now, input.quiet_hours || DEFAULT_QUIET_HOURS)) return { success: false, status: 'quiet_hours', error: 'Csendes időszak: az értesítés nem ment ki.' };
  const { data: tokens, error: tokenError } = await db.from('push_tokens').select('token, platform').eq('marketing_opt_in', true).eq('user_id', input.user_id);
  if (tokenError) throw new Error('Nem ellenőrizhetők a push-eszközök.');
  const valid = [...new Map((tokens || []).filter(t => validExpoToken(t.token)).map(t => [t.token, t])).values()];
  // No device is not a successful send, and must not consume the daily send allowance.
  if (!valid.length) return { success: false, status: 'no_token', tokens_targeted: 0, error: 'Nincs marketingértesítést engedélyező push-eszköz.' };
  const requestKey = input.template_id ? `template:${input.template_id}` : input.request_id || `manual:${input.title}:${input.body}:${Math.floor(now.getTime() / 3600000)}`;
  const id = await stableId(`${input.user_id}:${requestKey}`);
  const metadata = { sent_by: input.sent_by || null, via: 'expo_push', token_count: valid.length };
  const { data: reservation, error: reserveError } = await db.rpc('reserve_notification_delivery', {
    p_id: id, p_user_id: input.user_id, p_template_id: input.template_id || null,
    p_title: input.title, p_body: input.body, p_metadata: metadata,
    p_max_per_day: input.frequency_limit?.max_per_day ?? 2, p_cooldown_hours: input.frequency_limit?.per_user_hours ?? 6,
  });
  if (reserveError) throw new Error('A küldésbiztonsági ellenőrzés nem érhető el. Értesítést nem küldtünk.');
  if (!reservation?.reserved) return { success: false, status: reservation?.status || 'blocked', notification_id: id, error: reservation?.status === 'duplicate' ? 'Ezt a küldést már feldolgoztuk. Ellenőrizd az előzményt.' : 'Elérte az értesítési gyakorisági korlátot.' };
  let status = 'unknown';
  let tickets: Array<{ status?: string; id?: string; details?: { error?: string } }> = [];
  try {
    const response = await fetcher('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(Deno.env.get('EXPO_ACCESS_TOKEN') ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` } : {}) },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify(valid.map(t => ({ to: t.token, title: input.title, body: input.body, sound: 'default', ...(t.platform === 'android' ? { channelId: 'offers' } : {}), data: { template_id: input.template_id || null, url: input.deep_link || '/(tabs)/home' } }))),
    });
    const payload = await response.json();
    tickets = Array.isArray(payload?.data) ? payload.data : [];
    status = response.ok && tickets.length === valid.length ? (tickets.some(t => t.status === 'ok') ? 'sent' : 'failed') : 'unknown';
    for (let i = 0; i < tickets.length; i++) {
      if (tickets[i]?.details?.error === 'DeviceNotRegistered' && valid[i]) await db.from('push_tokens').delete().eq('user_id', input.user_id).eq('token', valid[i].token);
    }
  } catch { /* Ambiguous provider acceptance must never trigger an automatic resend. */ }
  const { error: logError } = await db.from('notification_logs').update({ status, metadata: { ...metadata, ticket_ids: tickets.filter(t => t.id).map(t => t.id), provider_accepted: tickets.filter(t => t.status === 'ok').length } }).eq('id', id);
  if (logError) return { success: false, status: 'unknown', notification_id: id, error: 'A szolgáltatói válasz naplózása nem sikerült. Ne küldd újra ellenőrzés nélkül.' };
  return { success: status === 'sent', status, notification_id: id, tokens_targeted: valid.length,
    ...(status === 'sent' ? {} : { error: status === 'unknown' ? 'A szolgáltató válasza nem igazolható. Ellenőrzés szükséges.' : 'A szolgáltató elutasította az értesítést.' }) };
}
