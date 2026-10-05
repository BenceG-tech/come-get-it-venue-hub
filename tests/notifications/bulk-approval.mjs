import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create table profiles(id uuid primary key,created_at timestamptz default now(),last_seen_at timestamptz,is_admin boolean not null default false);
create function public.is_admin(user_id uuid) returns boolean language sql stable security definer as $$select coalesce((select is_admin from public.profiles where id=user_id),false)$$;
create table user_points(user_id uuid primary key references profiles,balance integer);
create table push_tokens(user_id uuid references profiles,token text,marketing_opt_in boolean default false);
create table venue_drinks(id uuid primary key,category text);
create table redemptions(user_id uuid references profiles,drink_id uuid references venue_drinks,status text,redeemed_at timestamptz);
create table notification_scheduler_credentials(id text primary key,enabled boolean,endpoint_url text);
create table ai_notification_suggestions(id uuid primary key,user_id uuid references profiles,created_by uuid references profiles,generated_at timestamptz default now(),suggestions jsonb,context jsonb);
create table notification_templates(id uuid primary key,title_hu text not null,body_hu text not null,targeting jsonb,scheduled_at timestamptz,send_mode text,category text,priority text,deep_link text,created_by uuid references profiles,is_active boolean,dispatch_status text,dispatch_approved_at timestamptz,quiet_hours jsonb,frequency_limit jsonb,ttl_hours integer);
insert into notification_scheduler_credentials values('primary',true,'https://unit.invalid');
grant all on all tables in schema public to service_role;
`);
await db.exec(await readFile(new URL('../../supabase/migrations/20261005103519_notification_bulk_approval.sql',import.meta.url),'utf8'));
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const admin=id(1), a=id(2), b=id(3), c=id(4), noConsent=id(5), beer=id(6), voidBeer=id(7), expiredBeer=id(8);
for(const user of [admin,a,b,c,noConsent,beer,voidBeer,expiredBeer]) {
  await db.query('insert into profiles(id,is_admin) values($1,$2)',[user,user===admin]);
  await db.query('insert into user_points values($1,25)',[user]);
  await db.query('insert into push_tokens values($1,$2,$3)',[user,`ExpoPushToken[test_${user}]`,user!==noConsent]);
}
const now=(await db.query('select now() as now')).rows[0].now;
const at=new Date(now.getTime()+86400000); at.setUTCHours(12,30,0,0);
const schedule=at.toISOString();
let batchCounter=100;
const draft=(n,type,users) => ({id:id(n),type,user_ids:users,title_hu:'Nézd meg a helyeket',body_hu:'Fedezd fel a partnerhelyeket az appban.',deep_link:type==='points'?'/(tabs)/rewards':'/(tabs)/home',scheduled_at:schedule});
async function batch(drafts,context={scope:'campaign',drink_segment:'all'},owner=admin) {
  const key=id(batchCounter++);
  await db.query('insert into ai_notification_suggestions(id,user_id,created_by,suggestions,context) values($1,$2,$3,$4,$5)',[key,owner,admin,JSON.stringify(drafts),context]);
  return key;
}
const approve=async(key,selected,actor=admin)=>(await db.query('select approve_notification_recommendations($1,$2,$3) as result',[key,actor,JSON.stringify(selected.map(s=> typeof s==='string'?{suggestion_id:s}:s))])).rows[0].result;
// Overlap + repeat: counts must describe stored audience, not recalculated guesses.
const set=[draft(200,'points',[a,b]),draft(201,'welcome',[b,c]),draft(202,'reactivation',[]),draft(203,'discovery',[a,b,c])];
let key=await batch(set);
let result=await approve(key,set.map(s=>s.id));
assert.deepEqual(result.results.map(r=>r.status),['scheduled','scheduled','empty_audience','overlap_excluded']);
assert.deepEqual(result.results.map(r=>r.recipient_count),[2,1,0,0]);
assert.equal(result.unique_recipient_count,3); assert.equal(result.failed_count,2);
assert.equal((await approve(key,[set[0].id])).results[0].status,'already_scheduled');
assert.equal((await approve(key,[set[3].id])).results[0].status,'overlap_excluded','Prior approvals remain reserved on partial retries');
// Recoverable per-draft failure does not roll back the successful draft.
const partial=[draft(210,'points',[a]),draft(211,'discovery',[a,c])];
key=await batch(partial);
result=await approve(key,[{suggestion_id:partial[0].id},{suggestion_id:partial[1].id,scheduled_at:'invalid'}]);
assert.deepEqual(result.results.map(r=>r.status),['scheduled','failed']);
result=await approve(key,[partial[1].id]);
assert.equal(result.results[0].recipient_count,1); assert.equal(result.results[0].excluded_overlap_count,1);
// Deliberately selected admin is eligible; broad campaigns cannot include them.
let single=draft(220,'discovery',[admin]);
key=await batch([single],{scope:'user',scoped_user_id:admin,drink_segment:'all'});
assert.equal((await approve(key,[single.id])).results[0].status,'scheduled');
single=draft(221,'discovery',[admin,noConsent]); key=await batch([single]);
assert.equal((await approve(key,[single.id])).results[0].status,'empty_audience');
single=draft(222,'discovery',[a,b]);key=await batch([single],{scope:'user',scoped_user_id:a,drink_segment:'all'},a);
assert.equal((await approve(key,[single.id])).results[0].recipient_count,1,'Scoped cache cannot widen recipient list');
// Recheck consent immediately before insert, not merely at generation.
single=draft(223,'discovery',[a]); key=await batch([single]);
await db.query('update push_tokens set marketing_opt_in=false where user_id=$1',[a]);
assert.equal((await approve(key,[single.id])).results[0].status,'empty_audience');
await db.query('update push_tokens set marketing_opt_in=true where user_id=$1',[a]);
// Joined categories, successful redemptions and 180-day evidence; no text guesses.
await db.query("insert into venue_drinks values($1,'beer'),($2,'soft')",[id(900),id(901)]);
await db.query("insert into redemptions values($1,$4,'success',now()),($2,$4,'void',now()),($3,$4,'success',now()-interval '181 days')",[beer,voidBeer,expiredBeer,id(900)]);
const matched=(await db.query("select notification_segment_recipients($1,'beer') as ids",[[beer,voidBeer,expiredBeer,noConsent]])).rows[0].ids;
assert.deepEqual(matched,[beer]);
single=draft(230,'discovery',[beer,voidBeer,expiredBeer,a]); key=await batch([single],{scope:'campaign',drink_segment:'beer'});
assert.equal((await approve(key,[single.id])).results[0].recipient_count,1);
await assert.rejects(db.query("select notification_segment_recipients($1,'guessed')",[[a]]),/INVALID_DRINK_SEGMENT/);
// Unknown ids or duplicate selections reject before writes.
await assert.rejects(approve(key,[id(999)]),/UNKNOWN_SUGGESTION/);
await assert.rejects(approve(key,[single.id,single.id]),/DUPLICATE_SELECTION/);
await assert.rejects(approve(key,[single.id],a),/ADMIN_REQUIRED/);
// Concurrent submissions: one PK insert, second sees stored outcome under row lock.
single=draft(240,'discovery',[a]); key=await batch([single]);
const race=await Promise.all([approve(key,[single.id]),approve(key,[single.id])]);
assert.deepEqual(race.map(r=>r.results[0].status).sort(),['already_scheduled','scheduled']);
assert.equal((await db.query('select count(*)::int as n from notification_templates where id=$1',[single.id])).rows[0].n,1);
// Empty draft never becomes an implicit broadcast; per-draft size cap fails closed.
single=draft(250,'discovery',[]); key=await batch([single]);
assert.equal((await approve(key,[single.id])).results[0].status,'empty_audience');
single=draft(251,'discovery',Array.from({length:101},(_,i)=>id(1000+i)));key=await batch([single]);
assert.equal((await approve(key,[single.id])).results[0].status,'failed');
// One mixed batch approves distinct category messages, not four copies of one segment.
await db.query("insert into venue_drinks values($1,'wine')",[id(902)]);
await db.query("insert into redemptions values($1,$4,'success',now()),($1,$5,'success',now()),($2,$5,'success',now()),($3,$6,'success',now())",[a,b,c,id(900),id(902),id(901)]);
const mixed=['beer','wine','cocktail','non_alcoholic'].map((segment,index)=>({...draft(260+index,'discovery',[a,b,c,beer]),drink_segment:segment}));
key=await batch(mixed,{scope:'campaign',drink_segment:'mixed'});
result=await approve(key,mixed.map(d=>d.id));
assert.deepEqual(result.results.map(r=>r.recipient_count),[2,1,0,1]);
assert.equal(result.unique_recipient_count,4);
assert.equal(result.results[1].excluded_overlap_count,1);
const mixedTargets=(await db.query('select targeting from notification_templates where id=any($1::uuid[]) order by id',[mixed.map(d=>d.id)])).rows.map(r=>r.targeting.drink_segment);
assert.deepEqual(mixedTargets,['beer','wine','non_alcoholic']);
// Nullable/live legacy schema must not permit expiry bypass or missing evidence.
for (const stamp of [null,new Date(now.getTime()+86400000).toISOString()]) {
  single=draft(batchCounter+1000,'discovery',[a]); key=await batch([single]);
  await db.query('update ai_notification_suggestions set generated_at=$2 where id=$1',[key,stamp]);
  assert.equal((await approve(key,[single.id])).results[0].status,'failed');
}
single={...draft(290,'discovery',[beer]),drink_segment:'beer'}; key=await batch([single],{scope:'campaign',drink_segment:'mixed'});
await db.query("update redemptions set status='void' where user_id=$1",[beer]);
assert.equal((await approve(key,[single.id])).results[0].status,'empty_audience','History removed after draft creation must disqualify');
single={...draft(291,'discovery',[a]),drink_segment:'mixed'}; key=await batch([single]);
assert.equal((await approve(key,[single.id])).results[0].status,'failed','Mixed is a draft group, never an actual target segment');
// Service-only mutation; no SECURITY DEFINER escalation in exposed RPCs.
const acl=(await db.query(`select has_function_privilege('anon','public.approve_notification_recommendations(uuid,uuid,jsonb)','execute') as anon,
has_function_privilege('authenticated','public.approve_notification_recommendations(uuid,uuid,jsonb)','execute') as authenticated,
has_function_privilege('service_role','public.approve_notification_recommendations(uuid,uuid,jsonb)','execute') as service`)).rows[0];
assert.deepEqual(acl,{anon:false,authenticated:false,service:true});
assert.equal((await db.query("select count(*)::int as n from pg_proc where proname in ('notification_segment_recipients','approve_notification_recommendations') and prosecdef")).rows[0].n,0);
await db.close();
console.log('PASS: bulk partial outcomes, overlap/prior-approval reservation, consent, explicit admin scope, real history segments, idempotence/concurrent calls, size cap, ACL');
