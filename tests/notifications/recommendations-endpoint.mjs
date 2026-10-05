import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { webcrypto } from 'node:crypto';
import * as policy from '../../supabase/functions/_shared/notification-policy.ts';
const ADMIN='00000000-0000-4000-8000-000000000001', USER='00000000-0000-4000-8000-000000000002', BATCH='00000000-0000-4000-8000-000000000003';
const now='2026-10-05T12:00:00Z';
const code=stripTypeScriptTypes(readFileSync(new URL('../../supabase/functions/suggest-user-notification/index.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''),{mode:'transform'});
function fixture({profiles=[],reachable=[],segments={},bulk={success:false,results:[{suggestion_id:USER,status:'failed',recipient_count:0,error:'Retry'}],scheduled_count:0,failed_count:1,unique_recipient_count:0}}={}) {
  const operations=[],rpcs=[]; let saved,handler;
  function from(table) {
    const op={table,filters:[]};
    const chain={select(){return chain},eq(...filter){op.filters.push(filter);return chain},in(...filter){op.filters.push(filter);return chain},order(){return chain},limit(){return chain},insert(body){op.body=body;return chain},single(){return chain},
      then(resolve,reject){return Promise.resolve().then(()=>{
        operations.push(op);
        if(table==='profiles') return {data:profiles.filter(p=>op.filters.every(([key,value])=>p[key]===value)),error:null};
        if(table==='push_tokens') return {data:reachable.map(user_id=>({user_id,token:'ExpoPushToken[valid]'})),error:null};
        if(table==='user_points') return {data:profiles.map(p=>({user_id:p.id,balance:5})),error:null};
        if(table==='ai_notification_suggestions'){saved=op.body;return {data:{id:BATCH},error:null}}
        throw new Error(`unexpected table ${table}`);
      }).then(resolve,reject)}};return chain;
  }
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  const db={from,rpc:async(name,args)=>{rpcs.push({name,args:JSON.parse(JSON.stringify(args))});return {data:name==='notification_segment_recipients'?(segments[args.p_segment]||[]):bulk,error:null}}};
  class Clock extends Date {constructor(...args){super(...(args.length?args:[now]))}static now(){return Date.parse(now)}}
  vm.runInNewContext(code,{...policy,Request,Response,Date:Clock,Set,Map,crypto:webcrypto,console,
    database:()=>db,authorize:async(req)=>{if(!req.headers.has('authorization'))throw new Error('Unauthorized');return ADMIN},
    schedulerReady:async()=>true,corsHeaders:{},json,failure:error=>json({error:error.message},400),
    Deno:{env:{get:()=>undefined},serve:callback=>{handler=callback}},fetch:()=>{throw new Error('Unexpected provider call')}});
  return {operations,rpcs,get saved(){return saved},async call(body){const response=await handler(new Request('https://unit.invalid',{method:'POST',headers:{Authorization:'Bearer synthetic','Content-Type':'application/json'},body:JSON.stringify(body)}));return{status:response.status,body:await response.json()}}};
}
const profile=(id,is_admin=false)=>({id,is_admin,created_at:'2026-10-04T10:00:00Z',last_seen_at:null});
test('empty audience still returns four non-sendable drafts and a persisted batch',async()=>{
  const f=fixture();const {body}=await f.call({});assert.equal(body.suggestions.length,4);assert.equal(body.batch_id,BATCH);
  assert.ok(body.suggestions.every(s=>s.sendable===false && s.empty_reason && s.recipient_count===0 && !('user_ids'in s)));
});
test('explicit admin user is not silently filtered, campaign default still excludes admins',async()=>{
  const f=fixture({profiles:[profile(ADMIN,true)],reachable:[ADMIN]});const result=await f.call({user_id:ADMIN});
  assert.equal(result.body.suggestions.filter(s=>s.sendable).length,3);
  assert.ok(!f.operations.find(o=>o.table==='profiles').filters.some(([key])=>key==='is_admin'));
  const campaign=fixture({profiles:[profile(ADMIN,true)],reachable:[ADMIN]});
  assert.ok((await campaign.call({})).body.suggestions.every(s=>!s.sendable));
});
test('mixed request returns four distinct factual category drafts with independent evidence',async()=>{
  const f=fixture({profiles:[profile(USER)],reachable:[USER],segments:{beer:[USER]}});
  const {body}=await f.call({drink_segment:'mixed'});
  assert.deepEqual(body.suggestions.map(s=>s.drink_segment),['beer','wine','cocktail','non_alcoholic']);
  assert.deepEqual(body.suggestions.map(s=>s.sendable),[true,false,false,false]);
  assert.equal(f.saved.context.drink_segment,'mixed');assert.equal(f.rpcs.length,4);
});
test('invalid segment/scope/selection cannot reach approval RPC',async()=>{
  for(const body of [{drink_segment:'made-up'},{user_id:[USER]},{action:'approve_bulk',batch_id:BATCH,selections:[{suggestion_id:USER},{suggestion_id:USER}]}]){
    const f=fixture();assert.equal((await f.call(body)).status,400);assert.equal(f.rpcs.length,0);
  }
});
test('bulk forwards partial outcomes unchanged, strips browser audience and message overrides',async()=>{
  const f=fixture();const result=await f.call({action:'approve_bulk',batch_id:BATCH,selections:[{suggestion_id:USER,user_ids:[ADMIN],body_hu:'untrusted'}],user_id:ADMIN});
  assert.equal(result.status,200);assert.equal(result.body.results[0].status,'failed');
  assert.deepEqual(f.rpcs[0].args,{p_batch_id:BATCH,p_admin_id:ADMIN,p_selections:[{suggestion_id:USER}]});
});
test('ASAP ignores arbitrary browser time and uses the server quiet-hours/cron calculation',async()=>{
  const f=fixture();await f.call({action:'approve_bulk',batch_id:BATCH,delivery_mode:'as_soon_as_possible',selections:[{suggestion_id:USER,scheduled_at:'2020-01-01'}]});
  assert.equal(f.rpcs[0].args.p_selections[0].scheduled_at,'2026-10-05T12:05:00.000Z');
});
test('single approval remains compatible with previously scheduled idempotent result',async()=>{
  const f=fixture({bulk:{success:true,results:[{suggestion_id:USER,template_id:USER,status:'already_scheduled',recipient_count:1,scheduled_at:now}]}});
  const result=await f.call({action:'approve',batch_id:BATCH,suggestion_id:USER});
  assert.equal(result.body.success,true);assert.equal(result.body.status,'already_scheduled');assert.equal(result.body.template_id,USER);
});

test('sendable suggestions precede empty lifecycle drafts',async()=>{
  const f=fixture({profiles:[{...profile(ADMIN,true),created_at:'2020-01-01T00:00:00Z'}],reachable:[ADMIN]});
  const {body}=await f.call({user_id:ADMIN});
  assert.deepEqual(body.suggestions.map(s=>s.sendable),[true,true,false,false]);
  assert.deepEqual(body.suggestions.map(s=>s.priority_order),[1,2,3,4]);
});
