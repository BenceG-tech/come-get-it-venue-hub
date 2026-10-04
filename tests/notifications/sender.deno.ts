import { deliverNotification, type Database } from '../../supabase/functions/_shared/notification-server.ts';
const userId = '00000000-0000-4000-8000-000000000001';
const input = { user_id: userId, title: 'Nézz körül', body: 'Fedezd fel a partnerhelyeket.', deep_link: '/(tabs)/home', request_id: 'request-1' };
const now = new Date('2026-10-04T12:00:00Z');
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`); }
function fixture({ tokens = [{ token: 'ExpoPushToken[valid]', platform: 'android' }], reserved = true, reserveError = null as unknown, tokenError = null as unknown } = {}) {
  const updates: Record<string, unknown>[] = [], filters: unknown[][] = [];
  const db = {
    from(table: string) {
      let operation = 'select';
      const chain = { select() { return chain; }, eq(...filter: unknown[]) { filters.push(filter); return chain; },
        update(value: Record<string, unknown>) { operation = 'update'; updates.push(value); return chain; }, delete() { operation = 'delete'; return chain; },
        then(resolve: (v: unknown) => unknown) { return Promise.resolve(resolve({ data: table === 'push_tokens' && operation === 'select' ? tokens : null, error: table === 'push_tokens' ? tokenError : null })); } };
      return chain;
    },
    rpc() { return Promise.resolve({ data: { reserved, status: reserved ? 'processing' : 'duplicate' }, error: reserveError }); },
  } as unknown as Database;
  return { db, updates, filters };
}
Deno.test('no token is never reported sent and never calls provider', async () => {
  const f = fixture({ tokens: [] }); let calls = 0;
  const result = await deliverNotification(f.db, input, (() => { calls++; throw new Error('unexpected'); }) as typeof fetch, now);
  equal(result.status, 'no_token'); equal(result.success, false); equal(calls, 0); equal(f.filters[0], ['marketing_opt_in', true]);
});
Deno.test('duplicate reservation never contacts Expo', async () => {
  const f = fixture({ reserved: false }); let calls = 0;
  const result = await deliverNotification(f.db, input, (() => { calls++; throw new Error('unexpected'); }) as typeof fetch, now);
  equal(result.status, 'duplicate'); equal(calls, 0);
});
Deno.test('missing migration fails closed before provider', async () => {
  const f = fixture({ reserveError: new Error('missing RPC') }); let calls = 0, failed = false;
  try { await deliverNotification(f.db, input, (() => { calls++; throw new Error('unexpected'); }) as typeof fetch, now); } catch { failed = true; }
  equal(failed, true); equal(calls, 0);
});
Deno.test('consent lookup failure fails closed', async () => {
  const f = fixture({ tokenError: new Error('missing consent column') }); let calls = 0, failed = false;
  try { await deliverNotification(f.db, input, (() => { calls++; throw new Error('unexpected'); }) as typeof fetch, now); } catch { failed = true; }
  equal(failed, true); equal(calls, 0);
});
Deno.test('Expo acceptance uses internal url and Android offers channel', async () => {
  const f = fixture();
  const result = await deliverNotification(f.db, input, ((_url: unknown, init: RequestInit) => {
    const payload = JSON.parse(init.body as string); equal(payload[0].data.url, '/(tabs)/home'); equal(payload[0].channelId, 'offers');
    return Promise.resolve(new Response(JSON.stringify({ data: [{ status: 'ok', id: 'ticket' }] }), { status: 200 }));
  }) as typeof fetch, now);
  equal(result.status, 'sent'); equal(result.success, true); equal(f.updates[0].status, 'sent');
});
Deno.test('unknown provider result remains unknown, never a sent log', async () => {
  const f = fixture();
  const result = await deliverNotification(f.db, input, (() => Promise.reject(new Error('timeout'))) as typeof fetch, now);
  equal(result.status, 'unknown'); equal(result.success, false); equal(f.updates[0].status, 'unknown');
});
Deno.test('quiet hours stop before recipient or provider access', async () => {
  const f = fixture();
  const result = await deliverNotification(f.db, input, (() => Promise.reject(new Error('unexpected'))) as typeof fetch, new Date('2026-10-04T21:00:00Z'));
  equal(result.status, 'quiet_hours'); equal(f.filters.length, 0);
});

Deno.test('scheduler requires a matching dedicated key and enabled configuration', async () => {
  const { authorizeScheduler } = await import('../../supabase/functions/_shared/notification-server.ts');
  const key = 'a'.repeat(64);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)));
  const secret_hash = [...digest].map(b => b.toString(16).padStart(2, '0')).join('');
  let enabled = true;
  const chain = { select() { return chain; }, eq() { return chain; }, single() { return Promise.resolve({ data: { secret_hash, endpoint_url: 'https://example.supabase.co/functions/v1/process-scheduled-notifications', enabled }, error: null }); } };
  const db = { from() { return chain; } } as unknown as Database;
  equal(await authorizeScheduler(new Request('https://example.com'), db), false);
  equal(await authorizeScheduler(new Request('https://example.com', { headers: { 'x-scheduler-key': 'b'.repeat(64) } }), db), false);
  equal(await authorizeScheduler(new Request('https://example.com', { headers: { 'x-scheduler-key': key } }), db), true);
  enabled = false;
  equal(await authorizeScheduler(new Request('https://example.com', { headers: { 'x-scheduler-key': key } }), db), false);
});
