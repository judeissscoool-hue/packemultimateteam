import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import * as engine from '../supabase/functions/_shared/atu-engine-roster-20260919.js';
import {draftExposure,cloneDraftFairness} from '../supabase/functions/_shared/draft-history.js';

const seed=createHash('sha256').update('persistent-draft-history-tests').digest('hex');
const prior=engine.createClassicSession(seed);
const fair={session:2,shown:{},last:{},cards:{}};
for(const p of prior.draft.captain){fair.shown[p.name]=10;fair.last[p.name]=1;fair.cards[p.id]=10;}
const frozen=structuredClone(fair);
for(const pool of ['modern','history']){
 const version=engine.rulesForPool(pool,'draft'),session=engine.createClassicSession(seed,[],version,fair),events=[];
 assert.deepEqual(fair,frozen,'Starting must not mutate a frozen per-run snapshot');
 const act=e=>{session.apply(e);events.push(e);};
 act({type:'captain',cardId:session.draft.captain[0].id});
 for(const slot of engine.ALL_SLOTS)if(session.draft.roster[slot]==null){
  act({type:'open',slot});
  const once=draftExposure(session.draft);
  session.apply({type:'open',slot});
  assert.deepEqual(draftExposure(session.draft),once,'Reopening a cached board does not count cards twice');
  act({type:'pick',cardId:session.draft.opts[0].id});
 }
 assert.equal(Object.values(draftExposure(session.draft).cards).reduce((a,b)=>a+b,0),38,'Counts all captain and board offers, not just picks');
 const reloaded=engine.createClassicSession(seed,events,version,fair);
 assert.deepEqual(reloaded.draft,session.draft,'Reload reproduces all offers and choices');
 const transcript=[...events,{type:'arrange',roster:session.draft.roster}];
 assert.deepEqual(engine.validateTranscript(seed,transcript,'draft',version,fair).roster,session.draft.roster,'Server replay uses immutable history');
 assert.deepEqual(fair,frozen);
 assert.throws(()=>engine.validateTranscript(seed,transcript,'draft',version),/offered|arrangement|slot|position|roster/i,'A forged client history cannot be replayed without the server snapshot');
}
assert.deepEqual(engine.createClassicSession(seed).draft,engine.createClassicSession(seed,[],engine.CLASSIC_RULES_VERSION,null).draft,'Old runs retain their draw sequence');
assert.throws(()=>cloneDraftFairness({session:-1,shown:{},last:{},cards:{}}),/Invalid/);

// Test the actual authenticated Edge handler with database/RPC boundaries mocked.
const source=fs.readFileSync(new URL('../supabase/functions/draft-history/index.ts',import.meta.url),'utf8').replace(/import[^;]+;\r?\n/g,'');
const runId='12345678-1234-4123-8123-123456789abc',runToken='a'.repeat(64);
let handler,records=[],created=0;
let row={id:runId,user_id:'owner',mode:'draft',rules_version:engine.CLASSIC_RULES_VERSION,draft_seed:seed,nonce_hash:createHash('sha256').update(runToken).digest('hex'),draft_fairness:fair};
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server-only'};
const context=vm.createContext({...engine,draftExposure,console,Response,Request,Headers,TextEncoder,crypto:webcrypto,
 corsHeaders:{'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'},
 Deno:{env:{get:k=>env[k]},serve:f=>handler=f},
 createClient(_url,key){return key==='anon'?{
  auth:{async getUser(t){return t==='valid'?{data:{user:{id:'owner'}}}:{data:{},error:{message:'Invalid JWT'}};}},
  async rpc(name,args){assert.equal(name,'create_ranked_run');created++;return {data:[{run_id:runId,run_token:runToken,draft_seed:seed,rules_version:args.p_rules_version,expires_at:'2099-01-01'}]};}
 }:{from(){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:row};}};},
  async rpc(name,args){if(name==='initialize_draft_fairness')return {data:fair};assert.equal(name,'record_draft_exposure');records.push(args);return {data:null};}
 };}
});
vm.runInContext(stripTypeScriptTypes(source),context);
const request=(body,token='valid',origin='https://www.packemultimateteam.com')=>new Request('https://example.supabase.co/functions/v1/draft-history',{method:'POST',headers:{authorization:'Bearer '+token,origin,'content-type':'application/json'},body:JSON.stringify(body)});
let res=await handler(request({action:'start',pool:'modern'}));assert.equal(res.status,200);let response=await res.json();assert.deepEqual(response.run.draft_fairness,fair);assert.equal(records.length,1);assert.equal(created,1);
assert.equal(response.run.rules_version,'atu-classic-v4','Already-open old clients keep their matching rules');
for(const pool of ['modern','history']){
 const rulesVersion=engine.rulesForPool(pool,'draft');
 const started=await handler(request({action:'start',pool,rulesVersion}));
 assert.equal(started.status,200);assert.equal((await started.json()).run.rules_version,rulesVersion);
}
const createsBeforeInvalid=created;
assert.equal((await handler(request({action:'start',pool:'modern',rulesVersion:'atu-history-draft-v3'}))).status,400);
assert.equal(created,createsBeforeInvalid,'A pool/rules mismatch cannot create a run');
const previous={runId,runToken,events:[]};
res=await handler(request({action:'checkpoint',previous}));assert.equal(res.status,200);assert.deepEqual(records.at(-1).p_exposure,draftExposure(engine.createClassicSession(seed,[],engine.CLASSIC_RULES_VERSION,fair).draft));
const recorded=records.length;
assert.equal((await handler(request({action:'checkpoint',previous:{...previous,runToken:'b'.repeat(64)}}))).status,400);
row.user_id='other';assert.equal((await handler(request({action:'checkpoint',previous}))).status,400);row.user_id='owner';
assert.equal((await handler(request({action:'checkpoint',previous:{...previous,events:[{type:'captain',cardId:999999}]}}))).status,400);
assert.equal(records.length,recorded,'Forged and cross-account checkpoints never change history');
// Restart partially completed runs from both before and after the history release.
// Flush the old offers before initializing the replacement run's snapshot.
for(const snapshot of [null,fair]){
 row.draft_fairness=snapshot;
 const session=engine.createClassicSession(seed,[],engine.CLASSIC_RULES_VERSION,snapshot),events=[];
 const act=event=>{session.apply(event);events.push(event);};
 act({type:'captain',cardId:session.draft.captain[0].id});
 for(const slot of engine.ALL_SLOTS.filter(s=>session.draft.roster[s]==null).slice(0,3)){
  act({type:'open',slot});
  act({type:'pick',cardId:session.draft.opts[0].id});
 }
 const before=records.length;
 res=await handler(request({action:'start',pool:'modern',previous:{...previous,events}}));
 assert.equal(res.status,200,'A mid-draft restart accepts legacy and account-history runs');
 assert.deepEqual(records[before].p_exposure,draftExposure(session.draft),'Previous offers are saved before the new captain offers');
 assert.equal(records.length,before+2);
}
row.draft_fairness=fair;
assert.equal((await handler(request({action:'start',pool:'modern'},'bad'))).status,401);
assert.equal((await handler(request({action:'start',pool:'modern'},'valid','https://evil.example'))).status,403);
console.log('Persistent draft history: immutable replay, reloads, exposure counting, auth and tamper checks passed');
