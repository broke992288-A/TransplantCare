import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

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
const ALGORITHM_VERSION = "v3.0-kdigo2024-aasld2023";
const BATCH_SIZE = 20;

// ─── Country-aware unit conversion ───
// Uzbekistan stores creatinine/bilirubin in µmol/L; India uses mg/dL (standard).
// Risk engine always operates in mg/dL (standard SI).
function normalizeForCountry(param: string, value: number, country: string): number {
  if (country === "india") {
    // India values are already in mg/dL (standard) — no conversion needed
    return value;
  }
  // Uzbekistan (default): convert µmol/L → mg/dL
  switch (param) {
    case "total_bilirubin":
    case "direct_bilirubin":
      // µmol/L → mg/dL (÷ 17.1). Only convert if value looks like µmol/L (> 3 mg/dL boundary)
      return value > 3 ? Math.round((value / 17.1) * 100) / 100 : value;
    case "creatinine":
      // µmol/L → mg/dL (÷ 88.4). Only convert if value looks like µmol/L
      return value > 10 ? Math.round((value / 88.4) * 100) / 100 : value;
    case "urea":
      // mmol/L → mg/dL (× 6). Uzbekistan urea typically 2.5-8.2 mmol/L
      return value < 15 ? Math.round(value * 6 * 100) / 100 : value;
    case "hb":
      return value > 25 ? Math.round((value / 10) * 100) / 100 : value;
    case "platelets":
      return value > 1000 ? Math.round((value / 1000) * 100) / 100 : value;
    case "tlc":
      return value > 100 ? Math.round((value / 1000) * 100) / 100 : value;
    default:
      return value;
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

// ─── Time-dependent Tacrolimus windows ───
function kidneyTacrolimusScore(tac: number, daysTx: number | null): { pts: number; target: string; guideline: string } {
  if (tac <= 0) return { pts: 0, target: "", guideline: "KDIGO 2009/2024" };
  const d = daysTx ?? 999;
  if (d <= 90) {
    if (tac < 8) return { pts: 20, target: "8-12", guideline: "KDIGO 2009/2024" };
    if (tac > 12) return { pts: 15, target: "8-12", guideline: "KDIGO 2009/2024" };
  } else if (d <= 365) {
    if (tac < 6) return { pts: 20, target: "6-8", guideline: "KDIGO 2009/2024" };
    if (tac > 8) return { pts: 20, target: "6-8", guideline: "KDIGO 2009/2024" };
  } else {
    if (tac < 4) return { pts: 25, target: "4-6", guideline: "KDIGO 2009/2024" };
    if (tac > 6) return { pts: 25, target: "4-6", guideline: "KDIGO 2009/2024" };
  }
  return { pts: 0, target: d <= 90 ? "8-12" : d <= 365 ? "6-8" : "4-6", guideline: "KDIGO 2009/2024" };
}

function liverTacrolimusScore(tac: number, daysTx: number | null): { pts: number; target: string; guideline: string } {
  if (tac <= 0) return { pts: 0, target: "", guideline: "AASLD 2021/2023" };
  const d = daysTx ?? 999;
  if (d <= 30) {
    if (tac < 8) return { pts: 25, target: "8-10", guideline: "AASLD 2021/2023" };
    if (tac > 10) return { pts: 15, target: "8-10", guideline: "AASLD 2021/2023" };
  } else if (d <= 180) {
    if (tac < 6) return { pts: 20, target: "6-8", guideline: "AASLD 2021/2023" };
    if (tac > 8) return { pts: 20, target: "6-8", guideline: "AASLD 2021/2023" };
  } else {
    if (tac < 4) return { pts: 25, target: "4-7", guideline: "AASLD 2021/2023" };
    if (tac > 7) return { pts: 25, target: "4-7", guideline: "AASLD 2021/2023" };
  }
  return { pts: 0, target: d <= 30 ? "8-10" : d <= 180 ? "6-8" : "4-7", guideline: "AASLD 2021/2023" };
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

      // Track best creatinine for baseline-relative scoring
      let bestCreatinine: number | null = null;

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

        // Update best creatinine from previous labs
        if (lab.creatinine != null && lab.creatinine > 0) {
          if (bestCreatinine === null || lab.creatinine < bestCreatinine) {
            // Only use previous labs for baseline (not current)
            if (i > 0) bestCreatinine = Math.min(bestCreatinine ?? lab.creatinine, ...prevWindow.map(l => l.creatinine).filter((v): v is number => v != null && v > 0));
          }
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
          bk_virus_load: lab.bk_virus_load, cmv_load: lab.cmv_load, dsa_mfi: lab.dsa_mfi,
        };

        // ── Time-dependent Tacrolimus scoring ──
        const tac = lab.tacrolimus_level ?? 0;
        if (tac > 0) {
          const tacResult = patient.organ_type === "liver"
            ? liverTacrolimusScore(tac, daysTx)
            : kidneyTacrolimusScore(tac, daysTx);
          if (tacResult.pts > 0) {
            score += tacResult.pts;
            const msg = `Tacrolimus ${tac} ng/mL outside target [${tacResult.target}] (${tacResult.guideline})`;
            flags.push(msg);
            explanations.push({ key: "tacrolimus_abnormal", severity: "critical", message: msg, value: tac, guideline: tacResult.guideline });
          }
        }

        // ── Evaluate other thresholds (skip tacrolimus) ──
        for (const threshold of organThresholds) {
          if (threshold.parameter === "tacrolimus") continue;
          const value = labParamMap[threshold.parameter];
          if (value == null) continue;
          const result = evaluateValue(value, threshold);
          if (result.status !== "normal") {
            score += result.points;
            flags.push(result.message);
            explanations.push({ key: `${threshold.parameter}_${result.status}`, severity: result.status, message: result.message, value, threshold: result.status === "critical" ? (threshold.critical_min ?? threshold.critical_max) : (threshold.warning_min ?? threshold.warning_max), guideline: `${threshold.guideline_source} ${threshold.guideline_year}` });
          }

          // ── Enhanced ALT/AST trend: >50% vs median of last 3 → +30 pts (AASLD) ──
          if ((threshold.parameter === "alt" || threshold.parameter === "ast") && patient.organ_type === "liver" && prevWindow.length > 0 && value > 0) {
            const prevValues = prevWindow
              .map(l => threshold.parameter === "alt" ? l.alt : l.ast)
              .filter((v): v is number => v != null && v > 0);
            if (prevValues.length > 0) {
              const base = median(prevValues);
              const change = pctChange(base, value);
              if (change >= 50) {
                score += 30;
                const f = `${threshold.parameter.toUpperCase()} rapid increase: +${Math.abs(change).toFixed(0)}%`;
                trendFlags.push(f);
                flags.push(f);
                explanations.push({ key: `${threshold.parameter}_trend_up`, severity: "critical", message: `${threshold.parameter.toUpperCase()} increased ${Math.abs(change).toFixed(0)}% vs median of last ${prevValues.length} tests — Acute Injury/Rejection suspicion (AASLD 2021/2023)`, change_pct: change, guideline: "AASLD 2021/2023" });
                continue;
              }
            }
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
                const dir = trendUp ? "increased" : "decreased";
                const f = `${threshold.parameter} ${dir} ${Math.abs(change).toFixed(0)}%`;
                score += pts;
                trendFlags.push(f);
                flags.push(f);
                explanations.push({
                  key: `${threshold.parameter}_trend`,
                  severity: trendUp ? "critical" : "warning",
                  message: `${threshold.parameter.toUpperCase()} ${dir} by ${Math.abs(change).toFixed(0)}% vs median of previous ${previousValues.length} test(s) (${baseline} → ${value})`,
                  change_pct: change,
                  guideline: `${threshold.guideline_source} ${threshold.guideline_year}`,
                });
              }
            }
          }
        }

        // ── Baseline-relative creatinine for kidney (KDIGO 2009) ──
        if (patient.organ_type === "kidney" && lab.creatinine != null && lab.creatinine > 0 && bestCreatinine != null && bestCreatinine > 0) {
          if (lab.creatinine > bestCreatinine * 1.25) {
            score += 35;
            const msg = `Creatinine ${lab.creatinine} mg/dL >25% above best baseline ${bestCreatinine} mg/dL — Immediate Rejection Alert (KDIGO 2009)`;
            flags.push(msg);
            explanations.push({ key: "cr_baseline_alert", severity: "critical", message: msg, value: lab.creatinine, guideline: "KDIGO 2009" });
          }
        }

        // ── BK Virus (copies/ml) — KDIGO 2009/2024 ──
        if (patient.organ_type === "kidney") {
          const bk = lab.bk_virus_load ?? 0;
          if (bk > 10000) { score += 20; flags.push(`BK Virus high: ${bk} copies/ml`); explanations.push({ key: "bk_virus_high", severity: "critical", message: `BK Virus load ${bk} copies/ml — high risk of BK nephropathy (KDIGO 2009/2024)`, value: bk, guideline: "KDIGO 2009/2024" }); }
          else if (bk > 1000) { score += 10; flags.push(`BK Virus elevated: ${bk} copies/ml`); explanations.push({ key: "bk_virus_elevated", severity: "warning", message: `BK Virus load ${bk} copies/ml — monitor closely`, value: bk, guideline: "KDIGO 2009/2024" }); }

          const cmv = lab.cmv_load ?? 0;
          if (cmv > 1000) { score += 15; flags.push(`CMV high: ${cmv} copies/ml`); explanations.push({ key: "cmv_high", severity: "critical", message: `CMV viral load ${cmv} copies/ml — active infection risk`, value: cmv, guideline: "KDIGO 2009/2024" }); }
          else if (cmv > 500) { score += 8; flags.push(`CMV elevated: ${cmv} copies/ml`); explanations.push({ key: "cmv_elevated", severity: "warning", message: `CMV viral load ${cmv} copies/ml — monitor closely`, value: cmv }); }

          const dsa = lab.dsa_mfi ?? 0;
          if (dsa > 5000) { score += 20; flags.push(`DSA MFI high: ${dsa}`); explanations.push({ key: "dsa_high", severity: "critical", message: `Donor-Specific Antibody MFI ${dsa} — high rejection risk (Banff/KDIGO)`, value: dsa, guideline: "Banff/KDIGO" }); }
          else if (dsa > 1000) { score += 10; flags.push(`DSA MFI elevated: ${dsa}`); explanations.push({ key: "dsa_elevated", severity: "warning", message: `DSA MFI ${dsa} — monitor closely`, value: dsa }); }
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

        // Update best creatinine after processing
        if (lab.creatinine != null && lab.creatinine > 0) {
          if (bestCreatinine === null || lab.creatinine < bestCreatinine) {
            bestCreatinine = lab.creatinine;
          }
        }

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
