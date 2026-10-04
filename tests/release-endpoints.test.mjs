/** Node >=24: node --test tests/release-endpoints.test.mjs
 * Loads real Edge Function source; database/auth boundaries are mocked.
 * These contract tests do not claim to replace PostgreSQL transaction tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const USER = 'user-a';
const REWARD = '12345678-1234-4123-8123-123456789012';
const TOKEN = 'ExpoPushToken[new]';
const OLD_TOKEN = 'ExponentPushToken[old]';
const RECEIPT = { id: 'receipt-existing', notes: 'Redemption code: CGI-AABBCCDD', redeemed_at: '2026-10-04T18:00:00Z' };
const plain = value => JSON.parse(JSON.stringify(value));

function endpoint(name, { reply = () => ({ data: null, error: null }), rpcReply = { data: {}, error: null }, user = { id: USER } } = {}) {
  const operations = [];
  const rpcs = [];
  function from(table) {
    const operation = { table, method: 'select', filters: [] };
    let executed;
    const builder = {
      select(columns) { operation.columns = columns; return builder; },
      delete() { operation.method = 'delete'; return builder; },
      upsert(data, options) { operation.method = 'upsert'; operation.data = plain(data); operation.options = plain(options); return builder; },
      eq(...args) { operation.filters.push(['eq', ...args]); return builder; },
      in(...args) { operation.filters.push(['in', ...plain(args)]); return builder; },
      order(...args) { operation.order = plain(args); return builder; },
      limit(count) { operation.limit = count; return builder; },
      maybeSingle() { return builder; },
      then(resolve, reject) {
        if (!executed) { operations.push(operation); executed = Promise.resolve().then(() => reply(operation)); }
        return executed.then(resolve, reject);
      },
    };
    return builder;
  }
  const client = { from, auth: { getUser: async () => ({ data: { user }, error: null }) },
    rpc: async (rpcName, args) => { rpcs.push({ name: rpcName, args: plain(args) }); return typeof rpcReply === 'function' ? rpcReply() : rpcReply; } };
  let handler;
  const code = stripTypeScriptTypes(readFileSync(new URL(`../supabase/functions/${name}/index.ts`, import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, ''), { mode: 'transform' });
  vm.runInNewContext(code, {
    Response, Request, crypto: webcrypto, console, createClient: () => client,
    Deno: { env: { get: key => ({ SUPABASE_URL: 'https://unit.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' })[key] },
      serve: callback => { handler = callback; } },
  }, { filename: `${name}/index.ts` });
  return { operations, rpcs, async call(body, authorization = 'Bearer unit-jwt') {
    const response = await handler(new Request('https://unit.invalid', { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify(body) }));
    return { status: response.status, body: await response.json() };
  } };
}

function rewardReply({ receipts = [null], receiptError = null, balanceError = null } = {}) {
  let reads = 0;
  return operation => {
    if (operation.table === 'reward_redemptions') return { data: receipts[Math.min(reads++, receipts.length - 1)], error: receiptError };
    if (operation.table === 'user_points') return { data: { balance: 75 }, error: balanceError };
    if (operation.table === 'rewards') return { data: { name: 'Limonádé' }, error: null };
    throw new Error(`Unexpected table ${operation.table}`);
  };
}

test('reward status reads cannot spend points and are scoped to JWT owner', async () => {
  const h = endpoint('redeem-reward', { reply: rewardReply({ receipts: [RECEIPT] }) });
  const result = await h.call({ reward_id: REWARD, action: 'status', user_id: 'user-b' });
  assert.equal(result.status, 200);
  assert.equal(result.body.redemption.redemption_code, 'CGI-AABBCCDD');
  assert.equal(result.body.redemption.points_spent, 0);
  assert.equal(h.rpcs.length, 0);
  assert.ok(h.operations[0].filters.some(filter => filter[1] === 'user_id' && filter[2] === USER));
  assert.ok(h.operations.every(operation => operation.method === 'select'));
});

test('reopening an existing reward returns its original receipt without a mutation', async () => {
  const h = endpoint('redeem-reward', { reply: rewardReply({ receipts: [RECEIPT] }) });
  const result = await h.call({ reward_id: REWARD });
  assert.equal(result.status, 200);
  assert.equal(result.body.already_redeemed, true);
  assert.equal(result.body.redemption_id, RECEIPT.id);
  assert.equal(result.body.new_balance, 75);
  assert.equal(h.rpcs.length, 0);
});

test('unknown previous redemption status fails closed before any points mutation', async () => {
  const h = endpoint('redeem-reward', { reply: rewardReply({ receiptError: { message: 'database offline' } }) });
  const result = await h.call({ reward_id: REWARD });
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'REDEMPTION_STATUS_UNAVAILABLE');
  assert.equal(h.rpcs.length, 0);
});

test('an unreadable receipt balance also fails closed before mutation', async () => {
  const h = endpoint('redeem-reward', { reply: rewardReply({ receipts: [RECEIPT], balanceError: { message: 'offline' } }) });
  assert.equal((await h.call({ reward_id: REWARD })).status, 503);
  assert.equal(h.rpcs.length, 0);
});

test('concurrent redemption winner is returned after the atomic loser, without a retry', async () => {
  const h = endpoint('redeem-reward', { reply: rewardReply({ receipts: [null, RECEIPT] }),
    rpcReply: { data: null, error: { message: 'REWARD_ALREADY_REDEEMED' } } });
  const result = await h.call({ reward_id: REWARD, user_id: 'attacker-chosen-user' });
  assert.equal(result.status, 200);
  assert.equal(result.body.redemption_code, 'CGI-AABBCCDD');
  assert.equal(result.body.points_spent, 0);
  assert.equal(h.rpcs.length, 1);
  assert.equal(h.rpcs[0].args.p_user_id, USER);
  assert.match(h.rpcs[0].args.p_redemption_code, /^CGI-[A-F0-9]{8}$/);
});

test('insufficient points preserves business error when no concurrent receipt exists', async () => {
  const h = endpoint('redeem-reward', { reply: rewardReply(), rpcReply: { data: null, error: { message: 'INSUFFICIENT_POINTS' } } });
  const result = await h.call({ reward_id: REWARD });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, 'INSUFFICIENT_POINTS');
  assert.equal(h.rpcs.length, 1);
});

test('a successful fresh redemption exposes the atomic receipt unchanged', async () => {
  const atomicReceipt = { redemption_id: 'new-receipt', reward_name: 'Limonádé', new_balance: 50, points_spent: 25, redemption_code: 'CGI-11223344' };
  const h = endpoint('redeem-reward', { reply: rewardReply(), rpcReply: { data: atomicReceipt, error: null } });
  assert.deepEqual((await h.call({ reward_id: REWARD })).body, { success: true, ...atomicReceipt });
  assert.equal(h.rpcs.length, 1);
});

test('push endpoints require verified authentication before any database operations', async () => {
  for (const authorization of [null, 'Basic untrusted']) {
    const h = endpoint('register-push-token');
    assert.equal((await h.call({ token: TOKEN, marketing_opt_in: true, platform: 'ios' }, authorization)).status, 401);
    assert.equal(h.operations.length, 0);
  }
  const h = endpoint('register-push-token', { user: null });
  assert.equal((await h.call({ token: TOKEN, marketing_opt_in: false })).status, 401);
  assert.equal(h.operations.length, 0);
});

test('push registration rejects implicit consent and malformed token history without writes', async () => {
  for (const body of [
    { token: TOKEN, platform: 'ios' },
    { token: TOKEN, marketing_opt_in: true, platform: 'ios', previous_tokens: ['not-an-expo-token'] },
    { token: TOKEN, marketing_opt_in: true, platform: 'ios', previous_tokens: Array(101).fill(OLD_TOKEN) },
    { token: 'not-a-token', marketing_opt_in: false },
  ]) {
    const h = endpoint('register-push-token');
    assert.equal((await h.call(body)).status, 400);
    assert.equal(h.operations.length, 0);
  }
});

test('opt-out deletes current and previous tokens only for the verified owner', async () => {
  const h = endpoint('register-push-token');
  const result = await h.call({ token: TOKEN, previous_tokens: [OLD_TOKEN, TOKEN], marketing_opt_in: false, user_id: 'user-b' });
  assert.deepEqual(result, { status: 200, body: { success: true, enabled: false } });
  assert.deepEqual(h.operations, [{ table: 'push_tokens', method: 'delete',
    filters: [['eq', 'user_id', USER], ['in', 'token', [TOKEN, OLD_TOKEN]]] }]);
});

test('token rotation keeps original consent date and cleans obsolete tokens with owner scope', async () => {
  const consent = '2026-09-15T12:00:00Z';
  const h = endpoint('register-push-token', { reply: operation => ({ data: operation.method === 'select' ? { marketing_consent_at: consent } : null, error: null }) });
  const result = await h.call({ token: TOKEN, previous_tokens: [OLD_TOKEN], marketing_opt_in: true, platform: 'ios', user_id: 'user-b' });
  assert.equal(result.status, 200);
  const upsert = h.operations.find(operation => operation.method === 'upsert');
  assert.equal(upsert.data.user_id, USER);
  assert.equal(upsert.data.marketing_consent_at, consent);
  assert.deepEqual(upsert.options, { onConflict: 'token' });
  const removal = h.operations.find(operation => operation.method === 'delete');
  assert.deepEqual(removal.filters, [['eq', 'user_id', USER], ['in', 'token', [OLD_TOKEN]]]);
});

test('partial token rotation cleanup failure cannot be reported as successful', async () => {
  const h = endpoint('register-push-token', { reply: operation => ({ data: null, error: operation.method === 'delete' ? { message: 'offline' } : null }) });
  const result = await h.call({ token: TOKEN, previous_tokens: [OLD_TOKEN], marketing_opt_in: true, platform: 'ios' });
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'PUSH_PREFERENCE_SAVE_FAILED');
});
