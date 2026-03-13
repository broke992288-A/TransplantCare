import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALGORITHM_VERSION = "v2.0-kdigo2024";

// ─── Unit conversion helpers ───
function detectAndConvert(param: string, value: number): number {
  switch (param) {
    case "total_bilirubin":
    case "direct_bilirubin":
      return value > 30 ? Math.round((value / 17.1) * 100) / 100 : value;
    case "creatinine":
      return value > 30 ? Math.round((value / 88.4) * 100) / 100 : value;
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

// ─── CKD-EPI 2021 eGFR ───
function calculateEgfr(creatinine: number, age: number, sex: string): number {
  if (creatinine <= 0 || age <= 0) return 0;
  const isFemale = sex === "female";
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const sexCoeff = isFemale ? 1.012 : 1.0;
  const scrOverKappa = creatinine / kappa;
  return Math.round(
    142 *
      Math.pow(Math.min(scrOverKappa, 1), alpha) *
      Math.pow(Math.max(scrOverKappa, 1), -1.2) *
      Math.pow(0.9938, age) *
      sexCoeff
  );
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

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ─── Threshold evaluation ───
interface Threshold {
  parameter: string;
  organ_type: string;
  warning_min: number | null;
  warning_max: number | null;
  critical_min: number | null;
  critical_max: number | null;
  unit: string;
  guideline_source: string;
  guideline_year: number;
  risk_points_warning: number;
  risk_points_critical: number;
  trend_threshold_pct: number | null;
  trend_direction: string | null;
}

function evaluateValue(
  value: number,
  t: Threshold
): { status: string; points: number; message: string } {
  if (t.critical_min != null && value >= t.critical_min)
    return { status: "critical", points: t.risk_points_critical, message: `${t.parameter} ${value} ≥ ${t.critical_min}` };
  if (t.critical_max != null && value <= t.critical_max)
    return { status: "critical", points: t.risk_points_critical, message: `${t.parameter} ${value} ≤ ${t.critical_max}` };
  if (t.warning_min != null && value >= t.warning_min)
    return { status: "warning", points: t.risk_points_warning, message: `${t.parameter} ${value} ≥ ${t.warning_min}` };
  if (t.warning_max != null && value <= t.warning_max)
    return { status: "warning", points: t.risk_points_warning, message: `${t.parameter} ${value} ≤ ${t.warning_max}` };
  return { status: "normal", points: 0, message: "" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const targetPatientId = body.patient_id as string | undefined;

    // 1. Fetch all clinical thresholds
    const { data: allThresholds, error: thErr } = await supabase
      .from("clinical_thresholds")
      .select("*");
    if (thErr) throw new Error(`Thresholds fetch failed: ${thErr.message}`);
    const thresholds = (allThresholds ?? []) as Threshold[];

    // 2. Fetch patients
    let patientsQuery = supabase
      .from("patients")
      .select("id, organ_type, transplant_number, dialysis_history, transplant_date, date_of_birth, gender");
    if (targetPatientId) patientsQuery = patientsQuery.eq("id", targetPatientId);
    const { data: patients, error: pErr } = await patientsQuery;
    if (pErr) throw new Error(`Patients fetch failed: ${pErr.message}`);

    let totalProcessed = 0;
    let totalSnapshots = 0;
    let totalAlerts = 0;

    for (const patient of patients ?? []) {
      // 3. Fetch all labs for this patient ordered by date
      const { data: labs, error: labErr } = await supabase
        .from("lab_results")
        .select("*")
        .eq("patient_id", patient.id)
        .order("recorded_at", { ascending: true });
      if (labErr || !labs || labs.length === 0) continue;

      const organThresholds = thresholds.filter((t) => t.organ_type === patient.organ_type);
      const age = getAge(patient.date_of_birth);
      const sex = patient.gender === "female" ? "female" : "male";

      // Delete existing snapshots for this patient to recompute
      await supabase
        .from("risk_snapshots")
        .delete()
        .eq("patient_id", patient.id);

      const snapshotsToInsert: any[] = [];
      const alertsToInsert: any[] = [];

      for (let i = 0; i < labs.length; i++) {
        const lab = labs[i];
        const prevLab = i > 0 ? labs[i - 1] : null;

        // ── Step 1: Normalize units ──
        const CONVERTIBLE = ["total_bilirubin", "direct_bilirubin", "creatinine", "hb", "platelets", "tlc"];
        for (const param of CONVERTIBLE) {
          if (lab[param] != null) {
            lab[param] = detectAndConvert(param, lab[param]);
          }
        }

        // ── Step 2: Auto eGFR ──
        if (lab.egfr == null && lab.creatinine && age) {
          lab.egfr = calculateEgfr(lab.creatinine, age, sex);
        }

        // ── Step 3-4: Apply thresholds + Trend analysis ──
        let score = 0;
        const flags: string[] = [];
        const trendFlags: string[] = [];
        const explanations: any[] = [];

        // Time since transplant
        const daysTx = daysSince(patient.transplant_date);
        if (daysTx !== null && daysTx < 90) {
          score += 10;
          flags.push(`Early post-transplant: ${daysTx} days`);
        }

        const labParamMap: Record<string, number | null> = {
          tacrolimus: lab.tacrolimus_level,
          alt: lab.alt,
          ast: lab.ast,
          total_bilirubin: lab.total_bilirubin,
          direct_bilirubin: lab.direct_bilirubin,
          creatinine: lab.creatinine,
          egfr: lab.egfr,
          potassium: lab.potassium,
          proteinuria: lab.proteinuria,
          hb: lab.hb,
          albumin: lab.albumin,
          platelets: lab.platelets,
          inr: lab.inr,
          alp: lab.alp,
          ggt: lab.ggt,
          crp: lab.crp,
        };

        for (const threshold of organThresholds) {
          const paramKey = threshold.parameter;
          const value = labParamMap[paramKey];
          if (value == null) continue;

          const result = evaluateValue(value, threshold);
          if (result.status !== "normal") {
            score += result.points;
            flags.push(result.message);
            explanations.push({
              key: `${threshold.parameter}_${result.status}`,
              status: result.status,
              value,
              guideline: `${threshold.guideline_source} ${threshold.guideline_year}`,
            });
          }

          // Trend analysis
          if (prevLab && threshold.trend_threshold_pct != null) {
            const prevValue = prevLab[threshold.parameter as string] as number | null;
            if (prevValue != null && prevValue > 0 && value > 0) {
              const change = pctChange(prevValue, value);
              const trendUp = threshold.trend_direction === "up" && change >= threshold.trend_threshold_pct;
              const trendDown = threshold.trend_direction === "down" && change <= -threshold.trend_threshold_pct;
              if (trendUp || trendDown) {
                const pts = Math.round(threshold.risk_points_warning * 0.75);
                score += pts;
                const dir = trendUp ? "increased" : "decreased";
                const trendFlag = `${threshold.parameter} ${dir} ${Math.abs(change).toFixed(0)}%`;
                trendFlags.push(trendFlag);
                flags.push(trendFlag);
              }
            }
          }
        }

        // Clinical factors
        if ((patient.transplant_number ?? 1) >= 2) {
          score += 15;
          flags.push("Re-transplant patient");
        }
        if (patient.organ_type === "kidney" && patient.dialysis_history) {
          score += 20;
          flags.push("Dialysis history");
        }

        // Multiple abnormal bonus
        const abnormalCount = explanations.filter(
          (e: any) => e.status === "critical" || e.status === "warning"
        ).length;
        if (abnormalCount >= 3) {
          score += 10;
          flags.push(`Multiple abnormal: ${abnormalCount}`);
        }

        score = Math.min(score, 100);
        const level = score >= 60 ? "high" : score >= 30 ? "medium" : "low";

        // ── Build snapshot ──
        snapshotsToInsert.push({
          patient_id: patient.id,
          lab_result_id: lab.id,
          score,
          risk_level: level,
          creatinine: lab.creatinine,
          alt: lab.alt,
          ast: lab.ast,
          total_bilirubin: lab.total_bilirubin,
          tacrolimus_level: lab.tacrolimus_level,
          details: { flags, explanations },
          trend_flags: trendFlags,
          algorithm_version: ALGORITHM_VERSION,
          created_at: lab.recorded_at,
        });

        // ── Step 5: Generate alerts for critical values ──
        const criticalExplanations = explanations.filter((e: any) => e.status === "critical");
        if (criticalExplanations.length > 0) {
          alertsToInsert.push({
            patient_id: patient.id,
            alert_type: "risk_recalculation",
            severity: "critical",
            title: `Shifokor bilan maslahatlashish tavsiya etiladi`,
            message: flags.join("; "),
            is_read: true, // historical alerts marked as read
            created_at: lab.recorded_at,
          });
          totalAlerts++;
        }
      }

      // Batch insert snapshots
      if (snapshotsToInsert.length > 0) {
        const { error: snapErr } = await supabase
          .from("risk_snapshots")
          .insert(snapshotsToInsert);
        if (snapErr) {
          console.error(`Snapshot insert error for patient ${patient.id}:`, snapErr);
        } else {
          totalSnapshots += snapshotsToInsert.length;
        }
      }

      // Batch insert alerts
      if (alertsToInsert.length > 0) {
        await supabase.from("patient_alerts").insert(alertsToInsert);
      }

      // Update patient's current risk from the latest snapshot
      const latestSnapshot = snapshotsToInsert[snapshotsToInsert.length - 1];
      if (latestSnapshot) {
        await supabase
          .from("patients")
          .update({
            risk_level: latestSnapshot.risk_level,
            risk_score: Math.round(latestSnapshot.score),
            last_risk_evaluation: latestSnapshot.created_at,
          })
          .eq("id", patient.id);
      }

      totalProcessed++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        algorithm_version: ALGORITHM_VERSION,
        patients_processed: totalProcessed,
        snapshots_created: totalSnapshots,
        alerts_generated: totalAlerts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("recalculate-risk error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
