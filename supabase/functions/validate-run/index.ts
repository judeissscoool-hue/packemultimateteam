import { createClient } from "npm:@supabase/supabase-js@2.112.2";
import {
  ENGINE_VERSION,
  RULES_VERSION,
  validateTranscript
} from "../_shared/atu-engine-v1.js";

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
  return origin && allowedOrigins().has(origin) ? origin : null;
}

function responseHeaders(origin: string | null): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
    ...(origin ? {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
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
  const rawOrigin = req.headers.get("origin");
  const origin = requestOrigin(req);
  if (rawOrigin && !origin) return json(null, 403, { error: "Origin not allowed" });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(origin) });
  if (req.method !== "POST") return json(origin, 405, { error: "Method not allowed" });

  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return json(origin, 401, { error: "Authentication required" });

  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 300000) return json(origin, 413, { error: "Submission is too large" });
    const body: unknown = await req.json();
    if (!isObject(body)) return json(origin, 400, { error: "Invalid request body" });
    const runId = body.runId;
    const runToken = body.runToken;
    const transcript = body.transcript;
    if (typeof runId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)) {
      return json(origin, 400, { error: "Invalid run ID" });
    }
    if (typeof runToken !== "string" || !/^[a-f0-9]{64}$/.test(runToken)) {
      return json(origin, 400, { error: "Invalid run token" });
    }
    if (!Array.isArray(transcript)) return json(origin, 400, { error: "Invalid transcript" });
    if (new TextEncoder().encode(JSON.stringify(transcript)).length > 262144) {
      return json(origin, 413, { error: "Transcript is too large" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
    const publishableKey = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const secretKey = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(match[1]);
    if (userError || !userData.user) return json(origin, 401, { error: "Invalid or expired session" });

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const { data: run, error: runError } = await admin
      .from("game_runs")
      .select("id,user_id,mode,rules_version,draft_seed,status,expires_at")
      .eq("id", runId)
      .maybeSingle();
    if (runError) throw runError;
    if (!run
      || run.user_id !== userData.user.id
      || run.status !== "started"
      || new Date(run.expires_at).getTime() <= Date.now()) {
      return json(origin, 404, { error: "Active run not found" });
    }
    if (run.rules_version !== RULES_VERSION || !["draft", "pack", "one_v_one"].includes(run.mode)) {
      return json(origin, 409, { error: "This run uses an unsupported ruleset" });
    }

    let validated;
    try {
      validated = validateTranscript(run.draft_seed, transcript, run.mode);
    } catch (error) {
      return json(origin, 422, { error: validationMessage(error) });
    }

    const resultDigest = await sha256({
      engineVersion: ENGINE_VERSION,
      rulesVersion: run.rules_version,
      runId: run.id,
      userId: userData.user.id,
      seed: run.draft_seed,
      roster: validated.roster,
      transcript,
      result: validated.result
    });
    const { data: finalized, error: finalizeError } = await admin.rpc("finalize_validated_run", {
      p_run_id: run.id,
      p_user_id: userData.user.id,
      p_run_token: runToken,
      p_roster: validated.roster,
      p_transcript: transcript,
      p_score: validated.result.score,
      p_team_ovr: validated.result.teamOvr,
      p_projected_wins: validated.result.projectedWins,
      p_result_digest: resultDigest
    });
    if (finalizeError) {
      if (/already consumed|invalid|expired|active|current challenge state/i.test(finalizeError.message || "")) {
        return json(origin, 409, { error: "Run is invalid, expired or already submitted" });
      }
      throw finalizeError;
    }
    const outcome = Array.isArray(finalized) ? finalized[0] : finalized;
    return json(origin, 200, {
      ok: true,
      outcome: outcome?.outcome || "completed",
      challengeStatus: outcome?.challenge_status || null,
      winnerProfileId: outcome?.winner_profile_id || null,
      result: {
        teamOvr: validated.result.teamOvr,
        projectedWins: validated.result.projectedWins,
        chemistry: validated.result.chemistry,
        score: validated.result.score
      }
    });
  } catch (error) {
    console.error("validate-run failed", error instanceof Error ? error.message : error);
    return json(origin, 500, { error: "Could not validate this run" });
  }
});
