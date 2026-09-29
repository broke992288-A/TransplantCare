// Risk recalculation — delegates ALL scoring to the audited SQL engine
// (calculate_risk_score_sql via record_lab_risk_snapshot). No independent
// scoring logic lives here. Runs with the caller's JWT so RLS and
// can_access_patient() enforce ownership. Existing snapshots are never deleted.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const FN_NAME = "recalculate-risk";
const BATCH_SIZE = 20;

function log(level: string, msg: string, meta: Record<string, unknown> = {}) {
  const entry = { timestamp: new Date().toISOString(), level, function_name: FN_NAME, message: msg, ...meta };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  const rl = checkRateLimit(userId, { maxRequests: 5, windowMs: 10 * 60 * 1000, functionName: FN_NAME });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const isClinician = (roles ?? []).some((r: { role: string }) => r.role === "doctor" || r.role === "admin");
  if (!isClinician) {
    log("warn", "Forbidden caller", { requestId, userId });
    return json({ error: "Forbidden" }, 403);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { patient_id?: string; offset?: number; limit?: number };
    const offset = Number.isFinite(body.offset) ? Number(body.offset) : 0;
    const limit = Math.min(Math.max(Number(body.limit) || BATCH_SIZE, 1), 50);

    // RLS scopes this to patients the caller may access (assigned doctor / admin).
    let q = supabase.from("patients").select("id", { count: "exact" }).is("deleted_at", null).order("id");
    q = body.patient_id ? q.eq("id", body.patient_id) : q.range(offset, offset + limit - 1);
    const { data: patients, count, error: pErr } = await q;
    if (pErr) throw new Error(`Patients fetch failed: ${pErr.message}`);
    if (body.patient_id && (patients ?? []).length === 0) return json({ error: "Forbidden" }, 403);

    let processed = 0, snapshots = 0, failed = 0;
    let algorithmVersion: string | null = null;

    for (const p of patients ?? []) {
      const { data: lab } = await supabase
        .from("lab_results").select("id").eq("patient_id", p.id).is("deleted_at", null)
        .order("recorded_at", { ascending: false }).limit(1).maybeSingle();
      processed++;
      if (!lab) continue;
      const { data: risk, error: rErr } = await supabase.rpc("record_lab_risk_snapshot", { _lab_result_id: lab.id });
      if (rErr) {
        failed++;
        log("error", "Snapshot failed", { requestId, patient_id: p.id, error: rErr.message });
        continue;
      }
      snapshots++;
      algorithmVersion = (risk as { algorithm_version?: string } | null)?.algorithm_version ?? algorithmVersion;
    }

    const hasMore = !body.patient_id && (count ?? 0) > offset + limit;
    log("info", "Recalculation completed", { requestId, userId, processed, snapshots, failed, hasMore });
    return json({
      success: true, algorithm_version: algorithmVersion,
      patients_processed: processed, snapshots_created: snapshots, alerts_generated: 0, failed,
      has_more: hasMore, next_offset: hasMore ? offset + limit : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    log("error", "Recalculation error", { requestId, userId, error: message });
    return json({ success: false, error: message }, 500);
  }
});
