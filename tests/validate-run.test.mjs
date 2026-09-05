import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {webcrypto} from 'node:crypto';
import * as engine from '../supabase/functions/_shared/atu-engine-v1.js';

const source=fs.readFileSync(new URL('../supabase/functions/validate-run/index.ts',import.meta.url),'utf8').replace(/import[\s\S]*?from "[^"]+";\n/g,'');
let handler,finalized=0;
const seed='0123456789abcdef'.repeat(4),s=engine.createClassicSession(seed),events=[];
const apply=event=>{s.apply(event);events.push(event);};
apply({type:'captain',cardId:s.draft.captain[0].id});
for(const slot of [...engine.ALL_SLOTS].reverse())if(s.draft.roster[slot]==null){apply({type:'open',slot});apply({type:'pick',cardId:s.draft.opts[0].id});}
const body={runId:'12345678-1234-4123-8123-123456789abc',runToken:'a'.repeat(64),transcript:[...events,{type:'arrange',roster:s.draft.roster}]};
const run={id:body.runId,user_id:'owner',mode:'one_v_one',rules_version:engine.CLASSIC_RULES_VERSION,draft_seed:seed,status:'started',expires_at:'2099-01-01'};
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'test-server-only'};
const context=vm.createContext({
  ...engine,Response,Request,Headers,TextEncoder,crypto:webcrypto,console,
  corsHeaders:{'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'},
  Deno:{env:{get:name=>env[name]},serve(fn){handler=fn;}},
  createClient(_url,key){return key==='anon'?{auth:{async getUser(token){return token==='valid-session'?{data:{user:{id:'owner'}}}:{data:{user:null},error:{message:'Invalid JWT'}};}}}:{
    from(){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:run};}};},
    async rpc(name,args){assert.equal(name,'finalize_validated_run');assert.equal(args.p_run_token,body.runToken);assert.deepEqual(args.p_roster,s.draft.roster);finalized++;return {data:[{outcome:'creator_completed',challenge_status:'open'}]};}
  };}
});
vm.runInContext(stripTypeScriptTypes(source),context);
const origin='https://packemultimateteam.com';
const request=(method,payload=body,extra={})=>new Request('https://example.supabase.co/functions/v1/validate-run',{method,headers:{origin,'content-type':'application/json',authorization:'Bearer valid-session','x-client-info':'supabase-js-web/2.112.2',...extra},...(method==='POST'?{body:JSON.stringify(payload)}:{})});
const preflight=await handler(request('OPTIONS',null,{'access-control-request-headers':'authorization,apikey,content-type,x-client-info'}));
assert.equal(preflight.status,204);
assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
for(const header of ['authorization','apikey','content-type','x-client-info'])assert.ok(preflight.headers.get('access-control-allow-headers').includes(header),`${header} must pass browser preflight`);
const preview='https://packemultiamteteam-git-agent-classic-judeissscoool-5284s-projects.vercel.app';
assert.equal((await handler(request('OPTIONS',null,{origin:preview}))).headers.get('access-control-allow-origin'),preview);
assert.equal((await handler(request('OPTIONS',null,{origin:'https://evil.vercel.app'}))).status,403);
assert.equal((await handler(request('POST',body,{authorization:''}))).status,401);
assert.equal((await handler(request('POST',body,{authorization:'Bearer fake'}))).status,401);
const result=await handler(request('POST'));assert.equal(result.status,200);assert.equal((await result.json()).ok,true);assert.equal(finalized,1);
run.user_id='someone-else';assert.equal((await handler(request('POST'))).status,404);assert.equal(finalized,1);
run.user_id='owner';
const forged=structuredClone(body);forged.transcript[2].cardId=999999;
assert.equal((await handler(request('POST',forged))).status,422);assert.equal(finalized,1,'Invalid drafts must never reach finalization');
console.log('Validator browser preflight, authentication and submission tests passed');
