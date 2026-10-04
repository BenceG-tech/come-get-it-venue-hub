import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE public.push_tokens (id uuid primary key default gen_random_uuid());
CREATE TABLE public.notification_templates (id uuid primary key default gen_random_uuid());
CREATE TABLE public.notification_logs (id uuid primary key, user_id uuid not null, template_id uuid, title text not null, body text not null, sent_at timestamptz default now(), status text not null, metadata jsonb);
INSERT INTO public.push_tokens DEFAULT VALUES;
INSERT INTO public.notification_templates DEFAULT VALUES;
`);
await db.exec(await readFile(new URL('../../supabase/migrations/20261004211456_notification_dispatch_safety.sql', import.meta.url), 'utf8'));
assert.equal((await db.query('select marketing_opt_in from public.push_tokens')).rows[0].marketing_opt_in, false);
assert.equal((await db.query('select dispatch_approved_at from public.notification_templates')).rows[0].dispatch_approved_at, null);
const user = '00000000-0000-4000-8000-000000000001';
const ids = Array.from({ length: 5 }, (_, i) => `00000000-0000-4000-8000-00000000000${i + 2}`);
const reserve = async id => (await db.query('select public.reserve_notification_delivery($1,$2,null,$3,$4) as result', [id,user,'Title','Body'])).rows[0].result;
assert.equal((await reserve(ids[0])).reserved, true);
assert.equal((await reserve(ids[0])).status, 'duplicate');
assert.equal((await reserve(ids[1])).status, 'frequency_limited');
await db.query("update public.notification_logs set status='sent',sent_at=now()-interval '7 hours'");
assert.equal((await reserve(ids[1])).reserved, true);
await db.query("update public.notification_logs set status='sent',sent_at=now()-interval '7 hours'");
assert.equal((await reserve(ids[2])).status, 'frequency_limited');
await db.query("update public.notification_logs set status='failed'");
const double = await Promise.all([reserve(ids[3]), reserve(ids[3])]);
assert.equal(double.filter(r => r.reserved).length, 1);
assert.equal(double.filter(r => r.status === 'duplicate').length, 1);
const privileges = (await db.query(`select has_function_privilege('anon','public.reserve_notification_delivery(uuid,uuid,uuid,text,text,integer,integer,jsonb)','EXECUTE') as anon,
has_function_privilege('authenticated','public.reserve_notification_delivery(uuid,uuid,uuid,text,text,integer,integer,jsonb)','EXECUTE') as authenticated,
has_function_privilege('service_role','public.reserve_notification_delivery(uuid,uuid,uuid,text,text,integer,integer,jsonb)','EXECUTE') as service`)).rows[0];
assert.deepEqual(privileges, { anon: false, authenticated: false, service: true });
const functionConfig = (await db.query("select prosecdef from pg_proc where proname='reserve_notification_delivery'")).rows[0];
assert.equal(functionConfig.prosecdef, false);
await db.close();
console.log('PASS: migration, no consent/approval backfill, duplicate reservation, cooldown, daily cap, duplicate concurrent calls and RPC permissions');
