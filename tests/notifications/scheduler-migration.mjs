import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
// PostgreSQL syntax/permissions/configuration test; Vault/cron/net are isolated
// stubs. Actual extension installation and pg_cron runtime need staging verification.
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA extensions; CREATE SCHEMA vault; CREATE SCHEMA cron; CREATE SCHEMA net;
CREATE TABLE vault.decrypted_secrets (id uuid default gen_random_uuid(), name text unique, decrypted_secret text);
CREATE TABLE cron.test_jobs (name text, schedule text, command text);
CREATE TABLE net.test_calls (url text, headers jsonb);
CREATE FUNCTION extensions.gen_random_bytes(n integer) RETURNS bytea LANGUAGE sql AS 'select decode(repeat(''ab'',n),''hex'')';
CREATE FUNCTION extensions.digest(input text, algorithm text) RETURNS bytea LANGUAGE sql AS 'select sha256(convert_to(input,''UTF8''))';
CREATE FUNCTION vault.create_secret(secret text, name text, description text) RETURNS uuid LANGUAGE sql AS 'insert into vault.decrypted_secrets(name,decrypted_secret) values(name,secret) returning id';
CREATE FUNCTION cron.schedule(name text, schedule text, command text) RETURNS bigint LANGUAGE sql AS 'insert into cron.test_jobs values(name,schedule,command) returning 1::bigint';
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer) RETURNS bigint LANGUAGE sql AS 'insert into net.test_calls values(url,headers) returning 1::bigint';
`);
const source = await readFile(new URL('../../supabase/migrations/20261004213355_notification_scheduler.sql', import.meta.url), 'utf8');
await db.exec(source.replace(/^CREATE EXTENSION .*;$/gm, ''));
const job = (await db.query('select * from cron.test_jobs')).rows[0];
assert.equal(job.schedule, '*/5 * * * *');
assert.equal(job.command.includes('SERVICE_ROLE'), false);
await db.exec(job.command);
assert.equal((await db.query('select count(*)::int as n from net.test_calls')).rows[0].n, 0);
await db.query("update public.notification_scheduler_credentials set endpoint_url='https://example.supabase.co/functions/v1/process-scheduled-notifications'");
await db.exec(job.command);
assert.equal((await db.query('select count(*)::int as n from net.test_calls')).rows[0].n, 1);
assert.equal((await db.query("select length(headers->>'x-scheduler-key') as n from net.test_calls")).rows[0].n, 64);
const perms = (await db.query("select has_table_privilege('anon','public.notification_scheduler_credentials','SELECT') as anon,has_table_privilege('authenticated','public.notification_scheduler_credentials','SELECT') as authenticated,has_table_privilege('service_role','public.notification_scheduler_credentials','SELECT') as service")).rows[0];
assert.deepEqual(perms, { anon: false, authenticated: false, service: true });
assert.equal((await db.query("select relrowsecurity from pg_class where relname='notification_scheduler_credentials'")).rows[0].relrowsecurity, true);
await db.query('update public.notification_scheduler_credentials set enabled=false');
await db.exec(job.command);
assert.equal((await db.query('select count(*)::int as n from net.test_calls')).rows[0].n, 1);
await db.close();
console.log('PASS: scheduler SQL syntax, disabled-unconfigured gate, dedicated key header, cadence, RLS, credential grants (extensions stubbed; no network)');
