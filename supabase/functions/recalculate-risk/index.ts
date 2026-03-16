import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const ALLOWED_ORIGINS = ["https://lovable.app"];
const ALLOWED_HOST_SUFFIXES = [".lovable.app", ".lovableproject.com"];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";

  const allowed = (() => {
    if (!origin) return false;
    if (ALLOWED_ORIGINS.includes(origin)) return true;

    try {
      const { hostname } = new URL(origin);
      return ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
    } catch {
      return false;
    }
  })();

  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function log(level: string, fn: string, msg: string, meta: Record<string, unknown> = {}) {
  const entry = { timestamp: new Date().toISOString(), level, function_name: fn, message: msg, ...meta };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

async function authenticateRequest(req: Request, corsHeaders: Record<string, string>): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return { userId: data.claims.sub as string };
}

const FN_NAME = "recalculate-risk";
const ALGORITHM_VERSION = "v2.0-kdigo2024";
const BATCH_SIZE = 20;

// ─── Unit conversion helpers ───
function detectAndConvert(param: string, value: number): number {
  switch (param) {
    case "total_bilirubin": case "direct_bilirubin": return value > 30 ? Math.round((value / 17.1) * 100) / 100 : value;
    case "creatinine": return value > 30 ? Math.round((value / 88.4) * 100) / 100 : value;
    case "hb": return value > 25 ? Math.round((value / 10) * 100) / 100 : value;
    case "platelets": return value > 1000 ? Math.round((value / 1000) * 100) / 100 : value;
    case "tlc": return value > 100 ? Math.round((value / 1000) * 100) / 100 : value;
    default: return value;
  }
}

function calculateEgfr(creatinine: number, age: number, sex: string): number {
  if (creatinine <= 0 || age <= 0) return 0;
  const isFemale = sex === "female";
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const sexCoeff = isFemale ? 1.012 : 1.0;
  const scrOverKappa = creatinine / kappa;
  return Math.round(142 * Math.pow(Math.min(scrOverKappa, 1), alpha) * Math.pow(Math.max(scrOverKappa, 1), -1.2) * Math.pow(0.9938, age) * sexCoeff);
}

function getAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

function pctChange(prev: number, curr: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

interface Threshold {
  parameter: string; organ_type: string;
  warning_min: number | null; warning_max: number | null;
  critical_min: number | null; critical_max: number | null;
  unit: string; guideline_source: string; guideline_year: number;
  risk_points_warning: number; risk_points_critical: number;
  trend_threshold_pct: number | null; trend_direction: string | null;
}

function evaluateValue(value: number, t: Threshold): { status: string; points: number; message: string } {
  if (t.critical_min != null && value >= t.critical_min) return { status: "critical", points: t.risk_points_critical, message: `${t.parameter} ${value} ≥ ${t.critical_min}` };
  if (t.critical_max != null && value <= t.critical_max) return { status: "critical", points: t.risk_points_critical, message: `${t.parameter} ${value} ≤ ${t.critical_max}` };
  if (t.warning_min != null && value >= t.warning_min) return { status: "warning", points: t.risk_points_warning, message: `${t.parameter} ${value} ≥ ${t.warning_min}` };
  if (t.warning_max != null && value <= t.warning_max) return { status: "warning", points: t.risk_points_warning, message: `${t.parameter} ${value} ≤ ${t.warning_max}` };
  return { status: "normal", points: 0, message: "" };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  const authResult = await authenticateRequest(req, corsHeaders);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  // Rate limit: 5 recalculations per user per 10 minutes
  const rl = checkRateLimit(userId, { maxRequests: 5, windowMs: 10 * 60 * 1000, functionName: FN_NAME });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const targetPatientId = body.patient_id as string | undefined;
    const offset = (body.offset as number) ?? 0;
    const limit = (body.limit as number) ?? BATCH_SIZE;

    log("info", FN_NAME, "Recalculation started", { requestId, userId, targetPatientId, offset, limit });

    const { data: allThresholds, error: thErr } = await supabase.from("clinical_thresholds").select("*");
    if (thErr) throw new Error(`Thresholds fetch failed: ${thErr.message}`);
    const thresholds = (allThresholds ?? []) as Threshold[];

    let patientsQuery = supabase
      .from("patients")
      .select("id, organ_type, transplant_number, dialysis_history, transplant_date, date_of_birth, gender");
    if (targetPatientId) {
      patientsQuery = patientsQuery.eq("id", targetPatientId);
    } else {
      // Batch pagination for large datasets
      patientsQuery = patientsQuery.range(offset, offset + limit - 1);
    }
    const { data: patients, error: pErr } = await patientsQuery;
    if (pErr) throw new Error(`Patients fetch failed: ${pErr.message}`);

    let totalProcessed = 0, totalSnapshots = 0, totalAlerts = 0;

    for (const patient of patients ?? []) {
      const { data: labs, error: labErr } = await supabase
        .from("lab_results").select("*").eq("patient_id", patient.id).order("recorded_at", { ascending: true });
      if (labErr || !labs || labs.length === 0) continue;

      const organThresholds = thresholds.filter((t) => t.organ_type === patient.organ_type);
      const age = getAge(patient.date_of_birth);
      const sex = patient.gender === "female" ? "female" : "male";

      await supabase.from("risk_snapshots").delete().eq("patient_id", patient.id);
      await supabase.from("patient_alerts").delete().eq("patient_id", patient.id).in("alert_type", ["risk_recalculation", "risk"]);

      const snapshotsToInsert: any[] = [];
      const alertsToInsert: any[] = [];

      for (let i = 0; i < labs.length; i++) {
        const lab = labs[i];
        const prevWindow = labs.slice(Math.max(0, i - 4), i);

        const CONVERTIBLE = ["total_bilirubin", "direct_bilirubin", "creatinine", "hb", "platelets", "tlc"];
        for (const param of CONVERTIBLE) {
          if (lab[param] != null) lab[param] = detectAndConvert(param, lab[param]);
        }

        if (lab.egfr == null && lab.creatinine && age) {
          lab.egfr = calculateEgfr(lab.creatinine, age, sex);
        }

        let score = 0;
        const flags: string[] = [];
        const trendFlags: string[] = [];
        const explanations: any[] = [];

        const daysTx = daysSince(patient.transplant_date);
        if (daysTx !== null && daysTx < 90) { score += 10; flags.push(`Early post-transplant: ${daysTx} days`); }

        const labParamMap: Record<string, number | null> = {
          tacrolimus: lab.tacrolimus_level, alt: lab.alt, ast: lab.ast,
          total_bilirubin: lab.total_bilirubin, direct_bilirubin: lab.direct_bilirubin,
          creatinine: lab.creatinine, egfr: lab.egfr, potassium: lab.potassium,
          proteinuria: lab.proteinuria, hb: lab.hb, albumin: lab.albumin,
          platelets: lab.platelets, inr: lab.inr, alp: lab.alp, ggt: lab.ggt, crp: lab.crp,
        };

        for (const threshold of organThresholds) {
          const value = labParamMap[threshold.parameter];
          if (value == null) continue;
          const result = evaluateValue(value, threshold);
          if (result.status !== "normal") {
            score += result.points;
            flags.push(result.message);
            explanations.push({ key: `${threshold.parameter}_${result.status}`, severity: result.status, message: result.message, value, threshold: result.status === "critical" ? (threshold.critical_min ?? threshold.critical_max) : (threshold.warning_min ?? threshold.warning_max), guideline: `${threshold.guideline_source} ${threshold.guideline_year}` });
          }
          if (threshold.trend_threshold_pct != null && prevWindow.length > 0) {
            const previousValues = prevWindow
              .map((prevLab) => threshold.parameter === "tacrolimus"
                ? (prevLab.tacrolimus_level as number | null)
                : (prevLab[threshold.parameter as string] as number | null))
              .filter((prevValue): prevValue is number => prevValue != null && prevValue > 0);

            if (previousValues.length > 0 && value > 0) {
              const baseline = median(previousValues);
              const change = pctChange(baseline, value);
              const trendUp = threshold.trend_direction === "up" && change >= threshold.trend_threshold_pct;
              const trendDown = threshold.trend_direction === "down" && change <= -threshold.trend_threshold_pct;
              if (trendUp || trendDown) {
                const pts = Math.round(threshold.risk_points_warning * 0.75);
                score += pts;
                const dir = trendUp ? "increased" : "decreased";
                const f = `${threshold.parameter} ${dir} ${Math.abs(change).toFixed(0)}%`;
                trendFlags.push(f); flags.push(f);
              }
            }
          }
        }

        if ((patient.transplant_number ?? 1) >= 2) { score += 15; flags.push("Re-transplant patient"); }
        if (patient.organ_type === "kidney" && patient.dialysis_history) { score += 20; flags.push("Dialysis history"); }

        const abnormalCount = explanations.filter((e: any) => e.severity === "critical" || e.severity === "warning").length;
        if (abnormalCount >= 3) { score += 10; flags.push(`Multiple abnormal: ${abnormalCount}`); }

        score = Math.min(score, 100);
        const level = score >= 60 ? "high" : score >= 30 ? "medium" : "low";

        snapshotsToInsert.push({
          patient_id: patient.id, lab_result_id: lab.id, score, risk_level: level,
          creatinine: lab.creatinine, alt: lab.alt, ast: lab.ast,
          total_bilirubin: lab.total_bilirubin, tacrolimus_level: lab.tacrolimus_level,
          details: { flags, explanations }, trend_flags: trendFlags,
          algorithm_version: ALGORITHM_VERSION, created_at: lab.recorded_at,
        });

        const hasCriticalFinding = explanations.some((e: any) => e.severity === "critical") || score >= 60;
        if (hasCriticalFinding) {
          alertsToInsert.push({
            patient_id: patient.id, alert_type: "risk_recalculation", severity: level === "high" ? "critical" : "warning",
            title: `Shifokor bilan maslahatlashish tavsiya etiladi`,
            message: flags.join("; "), is_read: true, created_at: lab.recorded_at,
          });
          totalAlerts++;
        }
      }

      if (snapshotsToInsert.length > 0) {
        const { error: snapErr } = await supabase.from("risk_snapshots").insert(snapshotsToInsert);
        if (snapErr) log("error", FN_NAME, "Snapshot insert error", { requestId, patient_id: patient.id, error: snapErr.message });
        else totalSnapshots += snapshotsToInsert.length;
      }

      if (alertsToInsert.length > 0) {
        await supabase.from("patient_alerts").insert(alertsToInsert);
      }

      const latestSnapshot = snapshotsToInsert[snapshotsToInsert.length - 1];
      if (latestSnapshot) {
        await supabase.from("patients").update({
          risk_level: latestSnapshot.risk_level,
          risk_score: Math.round(latestSnapshot.score),
          last_risk_evaluation: latestSnapshot.created_at,
        }).eq("id", patient.id);
      }

      totalProcessed++;
    }

    // Count total patients to determine if more batches needed
    let hasMore = false;
    if (!targetPatientId) {
      const { count } = await supabase.from("patients").select("id", { count: "exact", head: true });
      hasMore = (count ?? 0) > offset + limit;
    }

    const duration = Date.now() - startTime;
    log("info", FN_NAME, "Recalculation completed", { requestId, userId, duration_ms: duration, totalProcessed, totalSnapshots, totalAlerts, hasMore });

    return new Response(
      JSON.stringify({
        success: true, algorithm_version: ALGORITHM_VERSION,
        patients_processed: totalProcessed, snapshots_created: totalSnapshots,
        alerts_generated: totalAlerts,
        has_more: hasMore, next_offset: hasMore ? offset + limit : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const duration = Date.now() - startTime;
    log("error", FN_NAME, "Recalculation error", { requestId, userId, duration_ms: duration, error: e instanceof Error ? e.message : "Unknown" });
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
