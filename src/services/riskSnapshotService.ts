import { supabase } from "@/integrations/supabase/client";
import type { LabResult } from "@/types/patient";
import { fetchClinicalThresholds, evaluateValue, type ClinicalThreshold } from "@/services/clinicalThresholdService";

export const CURRENT_ALGORITHM_VERSION = "v2.0-kdigo2024";

export interface RiskSnapshot {
  id: string;
  patient_id: string;
  lab_result_id: string | null;
  score: number;
  risk_level: string;
  creatinine: number | null;
  alt: number | null;
  ast: number | null;
  total_bilirubin: number | null;
  tacrolimus_level: number | null;
  details: Record<string, any>;
  trend_flags: string[];
  algorithm_version: string;
  created_at: string;
}

export interface RiskExplanation {
  key: string;
  message: string;
  severity: "critical" | "warning" | "info";
  value?: number;
  threshold?: number;
  change_pct?: number;
  guideline?: string;
}

/** Percentage change between two values */
function pctChange(prev: number, curr: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

/** Days between a date string and now */
function daysSinceDate(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// Fallback hardcoded thresholds (used only if DB fetch fails)
const FALLBACK_THRESHOLDS = {
  creatinine: { warning: 1.5, critical: 2.5 },
  alt: { warning: 60, critical: 120 },
  ast: { warning: 60, critical: 120 },
  total_bilirubin: { warning: 1.5, critical: 3.0 },
  tacrolimus: { low: 5, high: 15 },
};

/**
 * Compute risk score using clinical thresholds from the database.
 * Falls back to hardcoded thresholds if DB is unavailable.
 */
export async function computeRiskScoreAsync(
  organType: string,
  lab: LabResult,
  patient: {
    transplant_number?: number | null;
    dialysis_history?: boolean | null;
    transplant_date?: string | null;
  },
  prevLab?: LabResult | null
): Promise<{ score: number; level: string; flags: string[]; explanations: RiskExplanation[] }> {
  let thresholds: ClinicalThreshold[] = [];
  try {
    thresholds = await fetchClinicalThresholds();
  } catch (e) {
    console.warn("Failed to fetch thresholds, using fallback:", e);
  }

  const organThresholds = thresholds.filter((t) => t.organ_type === organType);

  // If we have DB thresholds, use them; otherwise fall back to sync version
  if (organThresholds.length > 0) {
    return computeRiskWithDbThresholds(organType, lab, patient, prevLab, organThresholds);
  }

  // Fallback to hardcoded
  return computeRiskScore(organType, lab, patient, prevLab);
}

function getThresholdFor(thresholds: ClinicalThreshold[], param: string): ClinicalThreshold | undefined {
  return thresholds.find((t) => t.parameter === param);
}

function computeRiskWithDbThresholds(
  organType: string,
  lab: LabResult,
  patient: { transplant_number?: number | null; dialysis_history?: boolean | null; transplant_date?: string | null },
  prevLab: LabResult | null | undefined,
  thresholds: ClinicalThreshold[]
): { score: number; level: string; flags: string[]; explanations: RiskExplanation[] } {
  let score = 0;
  const flags: string[] = [];
  const explanations: RiskExplanation[] = [];

  // --- Time since transplant ---
  const daysSinceTx = daysSinceDate(patient.transplant_date);
  if (daysSinceTx !== null && daysSinceTx < 90) {
    score += 10;
    flags.push(`Early post-transplant: ${daysSinceTx} days`);
    explanations.push({
      key: "early_post_tx",
      message: `Patient is ${daysSinceTx} days post-transplant (< 90 days), higher rejection risk`,
      severity: "warning",
      value: daysSinceTx,
      guideline: "ISHLT/AST 2023",
    });
  }

  // Map lab fields to threshold parameters
  const labParamMap: Record<string, number | null | undefined> = {
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

  // Evaluate each parameter against its threshold
  for (const threshold of thresholds) {
    const paramKey = threshold.parameter === "tacrolimus" ? "tacrolimus" : threshold.parameter;
    const value = labParamMap[paramKey];
    if (value == null) continue;

    const result = evaluateValue(value, threshold);
    if (result.status !== "normal") {
      score += result.points;
      flags.push(result.message);
      explanations.push({
        key: `${threshold.parameter}_${result.status}`,
        message: `${threshold.parameter.toUpperCase()} ${value} ${threshold.unit} — ${result.status === "critical" ? "critically abnormal" : "elevated"} (${threshold.guideline_source} ${threshold.guideline_year})`,
        severity: result.status,
        value: value,
        threshold: result.status === "critical"
          ? (threshold.critical_min ?? threshold.critical_max ?? undefined)
          : (threshold.warning_min ?? threshold.warning_max ?? undefined),
        guideline: `${threshold.guideline_source} ${threshold.guideline_year}`,
      });
    }

    // Trend analysis
    if (prevLab && threshold.trend_threshold_pct != null) {
      const prevValue = prevLab[threshold.parameter as keyof LabResult] as number | null;
      if (prevValue != null && prevValue > 0 && value > 0) {
        const change = pctChange(prevValue, value);
        const trendUp = threshold.trend_direction === "up" && change >= threshold.trend_threshold_pct;
        const trendDown = threshold.trend_direction === "down" && change <= -threshold.trend_threshold_pct;

        if (trendUp || trendDown) {
          const trendPoints = Math.round(threshold.risk_points_warning * 0.75);
          score += trendPoints;
          const dir = trendUp ? "increased" : "decreased";
          flags.push(`${threshold.parameter} ${dir}: ${Math.abs(change).toFixed(0)}%`);
          explanations.push({
            key: `${threshold.parameter}_trend`,
            message: `${threshold.parameter.toUpperCase()} ${dir} by ${Math.abs(change).toFixed(0)}% since last test (${prevValue} → ${value})`,
            severity: trendUp ? "critical" : "warning",
            change_pct: change,
            guideline: `${threshold.guideline_source} ${threshold.guideline_year}`,
          });
        }
      }
    }
  }

  // Clinical factors
  if ((patient.transplant_number ?? 1) >= 2) {
    score += 15;
    flags.push("Re-transplant patient");
    explanations.push({ key: "retransplant", message: "Re-transplant patient — higher baseline rejection risk", severity: "warning", guideline: "BANFF/ISHLT" });
  }

  if (organType === "kidney" && patient.dialysis_history) {
    score += 20;
    flags.push("Dialysis history");
    explanations.push({ key: "dialysis_history", message: "History of dialysis — higher baseline risk", severity: "warning", guideline: "KDIGO 2024" });
  }

  // Multiple abnormal values bonus
  const abnormalCount = explanations.filter((e) => e.severity === "critical" || e.severity === "warning").length;
  if (abnormalCount >= 3) {
    score += 10;
    flags.push(`Multiple abnormal values: ${abnormalCount}`);
    explanations.push({ key: "multiple_abnormal", message: `${abnormalCount} lab values are simultaneously abnormal`, severity: "warning" });
  }

  score = Math.min(score, 100);
  const level = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  return { score, level, flags, explanations };
}

/**
 * Synchronous fallback risk score computation (hardcoded thresholds).
 * Used when DB thresholds are unavailable.
 */
export function computeRiskScore(
  organType: string,
  lab: LabResult,
  patient: {
    transplant_number?: number | null;
    dialysis_history?: boolean | null;
    transplant_date?: string | null;
  },
  prevLab?: LabResult | null
): { score: number; level: string; flags: string[]; explanations: RiskExplanation[] } {
  let score = 0;
  const flags: string[] = [];
  const explanations: RiskExplanation[] = [];

  const tac = lab.tacrolimus_level ?? 0;
  const cr = lab.creatinine ?? 0;
  const alt = lab.alt ?? 0;
  const ast = lab.ast ?? 0;
  const bili = lab.total_bilirubin ?? 0;
  const egfr = lab.egfr ?? 999;

  const daysSinceTx = daysSinceDate(patient.transplant_date);
  if (daysSinceTx !== null && daysSinceTx < 90) {
    score += 10;
    flags.push(`Early post-transplant: ${daysSinceTx} days`);
    explanations.push({ key: "early_post_tx", message: `Patient is ${daysSinceTx} days post-transplant (< 90 days), higher rejection risk`, severity: "warning", value: daysSinceTx });
  }

  if (organType === "liver") {
    if (tac < FALLBACK_THRESHOLDS.tacrolimus.low) { score += 30; flags.push(`Tacrolimus low: ${tac}`); explanations.push({ key: "tacrolimus_low", message: `Tacrolimus ${tac} ng/mL below therapeutic range`, severity: "critical", value: tac, threshold: FALLBACK_THRESHOLDS.tacrolimus.low }); }
    else if (tac > FALLBACK_THRESHOLDS.tacrolimus.high) { score += 20; flags.push(`Tacrolimus high: ${tac}`); explanations.push({ key: "tacrolimus_high", message: `Tacrolimus ${tac} ng/mL above safe range`, severity: "warning", value: tac, threshold: FALLBACK_THRESHOLDS.tacrolimus.high }); }
    if (alt > FALLBACK_THRESHOLDS.alt.critical) { score += 30; flags.push(`ALT critical: ${alt}`); explanations.push({ key: "alt_critical", message: `ALT ${alt} U/L critically elevated`, severity: "critical", value: alt, threshold: FALLBACK_THRESHOLDS.alt.critical }); }
    else if (alt > FALLBACK_THRESHOLDS.alt.warning) { score += 15; flags.push(`ALT elevated: ${alt}`); explanations.push({ key: "alt_elevated", message: `ALT ${alt} U/L elevated`, severity: "warning", value: alt, threshold: FALLBACK_THRESHOLDS.alt.warning }); }
    if (ast > FALLBACK_THRESHOLDS.ast.critical) { score += 25; flags.push(`AST critical: ${ast}`); explanations.push({ key: "ast_critical", message: `AST ${ast} U/L critically elevated`, severity: "critical", value: ast, threshold: FALLBACK_THRESHOLDS.ast.critical }); }
    else if (ast > FALLBACK_THRESHOLDS.ast.warning) { score += 10; flags.push(`AST elevated: ${ast}`); explanations.push({ key: "ast_elevated", message: `AST ${ast} U/L elevated`, severity: "warning", value: ast, threshold: FALLBACK_THRESHOLDS.ast.warning }); }
    if (bili > FALLBACK_THRESHOLDS.total_bilirubin.critical) { score += 20; flags.push(`Bilirubin critical: ${bili}`); explanations.push({ key: "bilirubin_critical", message: `Bilirubin ${bili} mg/dL critically high`, severity: "critical", value: bili, threshold: FALLBACK_THRESHOLDS.total_bilirubin.critical }); }
    else if (bili > FALLBACK_THRESHOLDS.total_bilirubin.warning) { score += 10; flags.push(`Bilirubin elevated: ${bili}`); explanations.push({ key: "bilirubin_elevated", message: `Bilirubin ${bili} mg/dL elevated`, severity: "warning", value: bili, threshold: FALLBACK_THRESHOLDS.total_bilirubin.warning }); }
    if ((patient.transplant_number ?? 1) >= 2) { score += 15; flags.push("Re-transplant patient"); explanations.push({ key: "retransplant", message: "Re-transplant patient — higher baseline risk", severity: "warning" }); }
    if (prevLab) {
      const prevAlt = prevLab.alt ?? 0;
      if (prevAlt > 0 && alt > 0) { const c = pctChange(prevAlt, alt); if (c >= 40) { score += 15; flags.push(`ALT rapid increase: +${c.toFixed(0)}%`); explanations.push({ key: "alt_trend_up", message: `ALT increased ${c.toFixed(0)}%`, severity: "critical", change_pct: c }); } }
      const prevTac = prevLab.tacrolimus_level ?? 0;
      if (prevTac > 0 && tac > 0) { const c = pctChange(prevTac, tac); if (c <= -30) { score += 10; flags.push(`Tacrolimus dropped: ${c.toFixed(0)}%`); explanations.push({ key: "tac_trend_down", message: `Tacrolimus dropped ${Math.abs(c).toFixed(0)}%`, severity: "warning", change_pct: c }); } }
    }
  } else {
    if (cr > FALLBACK_THRESHOLDS.creatinine.critical) { score += 35; flags.push(`Creatinine critical: ${cr}`); explanations.push({ key: "creatinine_critical", message: `Creatinine ${cr} mg/dL critically elevated`, severity: "critical", value: cr, threshold: FALLBACK_THRESHOLDS.creatinine.critical }); }
    else if (cr > FALLBACK_THRESHOLDS.creatinine.warning) { score += 15; flags.push(`Creatinine elevated: ${cr}`); explanations.push({ key: "creatinine_elevated", message: `Creatinine ${cr} mg/dL elevated`, severity: "warning", value: cr, threshold: FALLBACK_THRESHOLDS.creatinine.warning }); }
    if (egfr < 30) { score += 30; flags.push(`eGFR very low: ${egfr}`); explanations.push({ key: "egfr_very_low", message: `eGFR ${egfr} severe impairment`, severity: "critical", value: egfr, threshold: 30 }); }
    else if (egfr < 45) { score += 15; flags.push(`eGFR low: ${egfr}`); explanations.push({ key: "egfr_low", message: `eGFR ${egfr} moderate impairment`, severity: "warning", value: egfr, threshold: 45 }); }
    if (tac < FALLBACK_THRESHOLDS.tacrolimus.low) { score += 20; flags.push(`Tacrolimus low: ${tac}`); explanations.push({ key: "tacrolimus_low", message: `Tacrolimus ${tac} ng/mL below range`, severity: "critical", value: tac, threshold: FALLBACK_THRESHOLDS.tacrolimus.low }); }
    else if (tac > FALLBACK_THRESHOLDS.tacrolimus.high) { score += 15; flags.push(`Tacrolimus high: ${tac}`); explanations.push({ key: "tacrolimus_high", message: `Tacrolimus ${tac} ng/mL above range`, severity: "warning", value: tac, threshold: FALLBACK_THRESHOLDS.tacrolimus.high }); }
    if (patient.dialysis_history) { score += 20; flags.push("Dialysis history"); explanations.push({ key: "dialysis_history", message: "History of dialysis", severity: "warning" }); }
    if (prevLab) {
      const prevCr = prevLab.creatinine ?? 0;
      if (prevCr > 0 && cr > 0) { const c = pctChange(prevCr, cr); if (c >= 30) { score += 15; flags.push(`Creatinine rapid increase: +${c.toFixed(0)}%`); explanations.push({ key: "cr_trend_up", message: `Creatinine increased ${c.toFixed(0)}%`, severity: "critical", change_pct: c }); } }
      const prevEgfr = prevLab.egfr ?? 999;
      if (prevEgfr < 900 && egfr < 900) { const c = pctChange(prevEgfr, egfr); if (c <= -20) { score += 10; flags.push(`eGFR declining: ${c.toFixed(0)}%`); explanations.push({ key: "egfr_trend_down", message: `eGFR declined ${Math.abs(c).toFixed(0)}%`, severity: "warning", change_pct: c }); } }
    }
    const abnormalCount = [cr > FALLBACK_THRESHOLDS.creatinine.warning, egfr < 45, tac < FALLBACK_THRESHOLDS.tacrolimus.low || tac > FALLBACK_THRESHOLDS.tacrolimus.high].filter(Boolean).length;
    if (abnormalCount >= 2) { score += 10; flags.push(`Multiple abnormal: ${abnormalCount}`); explanations.push({ key: "multiple_abnormal", message: `${abnormalCount} values abnormal`, severity: "warning" }); }
  }

  score = Math.min(score, 100);
  const level = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  return { score, level, flags, explanations };
}

export async function insertRiskSnapshot(data: {
  patient_id: string;
  lab_result_id?: string | null;
  score: number;
  risk_level: string;
  creatinine?: number | null;
  alt?: number | null;
  ast?: number | null;
  total_bilirubin?: number | null;
  tacrolimus_level?: number | null;
  details?: Record<string, any>;
}) {
  const { data: row, error } = await supabase
    .from("risk_snapshots")
    .insert(data as any)
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function fetchRiskSnapshots(patientId: string, limit = 10) {
  const { data, error } = await supabase
    .from("risk_snapshots")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as RiskSnapshot[];
}

export async function fetchLatestRiskSnapshot(patientId: string) {
  const { data, error } = await supabase
    .from("risk_snapshots")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as RiskSnapshot | null;
}
