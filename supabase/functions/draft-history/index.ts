import { createClient } from "npm:@supabase/supabase-js@2.112.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2.112.2/cors";
import { getEngineForRules, rulesForPool } from "../_shared/atu-engine-roster-20260919.js";
import { draftExposure } from "../_shared/draft-history.js";

type JsonRecord = Record<string, unknown>;

const DEFAULT_ALLOWED_ORIGINS = [
  "https://packemultimateteam.com",
  "https://www.packemultimateteam.com",
  "https://judeissscoool-hue.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
];

function envKey(currentName: string, legacyName: string): string {
  const current = Deno.env.get(currentName);
  if (current) {
    try {
      const named = JSON.parse(current);
      if (named && typeof named.default === "string") return named.default;
    } catch {
      if (current.startsWith("sb_")) return current;
    }
  }
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  throw new Error(`Missing ${currentName}`);
}

function allowedOrigins(): Set<string> {
  const configured = (Deno.env.get("ATU_ALLOWED_ORIGINS") || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function requestOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  const preview = origin && /^https:\/\/packemultiamteteam-[a-z0-9-]+-judeissscoool-5284s-projects\.vercel\.app$/.test(origin);
  return origin && (allowedOrigins().has(origin) || preview) ? origin : null;
}

function responseHeaders(origin: string | null): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
    ...(origin ? {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": corsHeaders["Access-Control-Allow-Headers"],
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    } : {})
  };
}

function json(origin: string | null, status: number, body: JsonRecord): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(origin)
  });
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as JsonRecord;
  return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function isObject(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validationMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.slice(0, 180);
  return "Invalid run transcript";
}

Deno.serve(async (req: Request) => {
  const origin=requestOrigin(req);
  if(req.headers.get('origin')&&!origin)return json(null,403,{error:'Origin not allowed'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:responseHeaders(origin)});
  if(req.method!=='POST')return json(origin,405,{error:'Method not allowed'});
  const authorization=req.headers.get('authorization')||'';
  const token=authorization.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  if(!token)return json(origin,401,{error:'Authentication required'});
  try {
    const raw=await req.text();
    if(new TextEncoder().encode(raw).length>100000)return json(origin,413,{error:'Request too large'});
    const body=JSON.parse(raw);
    if(!isObject(body)||!['start','checkpoint'].includes(body.action as string))return json(origin,400,{error:'Invalid draft history action'});
    const url=Deno.env.get('SUPABASE_URL')!;
    const userClient=createClient(url,envKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userData,error:authError}=await userClient.auth.getUser(token);
    if(authError||!userData.user)return json(origin,401,{error:'Invalid session'});
    const userId=userData.user.id;
    const admin=createClient(url,envKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});

    const record=async (previous: unknown) => {
      if(!isObject(previous)||typeof previous.runId!=='string'||typeof previous.runToken!=='string'||!Array.isArray(previous.events)||previous.events.length>256)throw new Error('Invalid previous draft');
      const {data:run,error}=await admin.from('game_runs').select('id,user_id,mode,rules_version,draft_seed,nonce_hash,draft_fairness').eq('id',previous.runId).maybeSingle();
      if(error)throw error;
      if(!run||run.user_id!==userId||run.mode!=='draft')throw new Error('Draft not found');
      if(!/^[a-f0-9]{64}$/.test(previous.runToken))throw new Error('Invalid run token');
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(previous.runToken));
      const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
      if(hash!==run.nonce_hash)throw new Error('Invalid run token');
      // Older rule versions keep their old behavior and cannot inject history.
      if(!['atu-classic-v4','atu-history-draft-v2','atu-classic-v5','atu-history-draft-v3'].includes(run.rules_version))return;
      const engine=getEngineForRules(run.rules_version);
      const session=engine.createClassicSession(run.draft_seed,previous.events,run.draft_fairness);
      const result=await admin.rpc('record_draft_exposure',{p_run_id:run.id,p_user_id:userId,p_exposure:draftExposure(session.draft)});
      if(result.error)throw result.error;
    };

    if(body.action==='checkpoint'){
      await record(body.previous);
      return json(origin,200,{ok:true});
    }
    if(body.pool!=='modern'&&body.pool!=='history')return json(origin,400,{error:'Invalid player pool'});
    // Flush the complete previous transcript before taking the next immutable snapshot.
    if(body.previous)await record(body.previous);
    // Older open website tabs omit rulesVersion and must continue using their
    // original roster. New clients explicitly request the new supported rules.
    const previousVersion=body.pool==='history'?'atu-history-draft-v2':'atu-classic-v4';
    const version=body.rulesVersion??previousVersion;
    if(![previousVersion,rulesForPool(body.pool,'draft')].includes(version))return json(origin,400,{error:'Invalid draft rules'});
    const created=await userClient.rpc('create_ranked_run',{p_mode:'draft',p_rules_version:version});
    if(created.error)throw created.error;
    const run=Array.isArray(created.data)?created.data[0]:created.data;
    if(!run)throw new Error('Could not start draft');
    const initialized=await admin.rpc('initialize_draft_fairness',{p_run_id:run.run_id,p_user_id:userId});
    if(initialized.error)throw initialized.error;
    const fairness=initialized.data;
    const session=getEngineForRules(version).createClassicSession(run.draft_seed,[],fairness);
    const saved=await admin.rpc('record_draft_exposure',{p_run_id:run.run_id,p_user_id:userId,p_exposure:draftExposure(session.draft)});
    if(saved.error)throw saved.error;
    return json(origin,200,{ok:true,run:{...run,draft_fairness:fairness}});
  } catch(error) {
    return json(origin,400,{error:validationMessage(error)});
  }
});
