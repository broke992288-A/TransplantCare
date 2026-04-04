import { supabase } from "@/integrations/supabase/client";
import type { LabResult } from "@/types/patient";
import { fetchClinicalThresholds, evaluateValue, type ClinicalThreshold } from "@/services/clinicalThresholdService";
import type { TablesInsert } from "@/integrations/supabase/types";

export const CURRENT_ALGORITHM_VERSION = "v3.0-kdigo2024-aasld2023";

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
  details: RiskDetails;
  trend_flags: string[];
  algorithm_version: string;
  created_at: string;
}

export interface RiskDetails {
  flags?: string[];
  explanations?: RiskExplanation[];
  [key: string]: unknown;
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

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

type HistoricalLabInput = LabResult | LabResult[] | null | undefined;

function normalizeHistoricalLabs(historicalLabs: HistoricalLabInput): LabResult[] {
  if (!historicalLabs) return [];
  const labs = (Array.isArray(historicalLabs) ? historicalLabs : [historicalLabs]).filter(Boolean);
  return labs.slice(0, 4);
}

function getLabMetricValue(lab: Partial<LabResult> | null | undefined, parameter: string): number | null {
  if (!lab) return null;

  const metricMap: Record<string, number | null | undefined> = {
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

  const value = metricMap[parameter];
  return typeof value === "number" ? value : value ?? null;
}

function getWindowTrendSignal(
  currentValue: number,
  historicalLabs: LabResult[],
  parameter: string,
  thresholdPct: number,
  trendDirection: string | null
) {
  if (currentValue <= 0 || !trendDirection) return null;

  const previousValues = historicalLabs
    .map((lab) => getLabMetricValue(lab, parameter))
    .filter((value): value is number => typeof value === "number" && value > 0)
    .slice(0, 4);

  if (previousValues.length === 0) return null;

  const baseline = median(previousValues);
  const change_pct = pctChange(baseline, currentValue);
  const trendUp = trendDirection === "up" && change_pct >= thresholdPct;
  const trendDown = trendDirection === "down" && change_pct <= -thresholdPct;

  if (!trendUp && !trendDown) return null;

  return {
    baseline,
    change_pct,
    direction: trendUp ? "increased" : "decreased",
    sample_count: previousValues.length,
  };
}

/** Days between a date string and now */
function daysSinceDate(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ─── Time-dependent Tacrolimus scoring ───

function kidneyTacrolimusScore(tac: number, daysSinceTx: number | null): { pts: number; target: string; guideline: string } {
  if (tac <= 0) return { pts: 0, target: "", guideline: "KDIGO 2009/2024" };
  const days = daysSinceTx ?? 999;
  if (days <= 90) {
    if (tac < 8) return { pts: 20, target: "8-12", guideline: "KDIGO 2009/2024" };
    if (tac > 12) return { pts: 15, target: "8-12", guideline: "KDIGO 2009/2024" };
  } else if (days <= 365) {
    if (tac < 6) return { pts: 20, target: "6-8", guideline: "KDIGO 2009/2024" };
    if (tac > 8) return { pts: 20, target: "6-8", guideline: "KDIGO 2009/2024" };
  } else {
    if (tac < 4) return { pts: 25, target: "4-6", guideline: "KDIGO 2009/2024" };
    if (tac > 6) return { pts: 25, target: "4-6", guideline: "KDIGO 2009/2024" };
  }
  return { pts: 0, target: days <= 90 ? "8-12" : days <= 365 ? "6-8" : "4-6", guideline: "KDIGO 2009/2024" };
}

function liverTacrolimusScore(tac: number, daysSinceTx: number | null): { pts: number; target: string; guideline: string } {
  if (tac <= 0) return { pts: 0, target: "", guideline: "AASLD 2021/2023" };
  const days = daysSinceTx ?? 999;
  if (days <= 30) {
    if (tac < 8) return { pts: 25, target: "8-10", guideline: "AASLD 2021/2023" };
    if (tac > 10) return { pts: 15, target: "8-10", guideline: "AASLD 2021/2023" };
  } else if (days <= 180) {
    if (tac < 6) return { pts: 20, target: "6-8", guideline: "AASLD 2021/2023" };
    if (tac > 8) return { pts: 20, target: "6-8", guideline: "AASLD 2021/2023" };
  } else {
    if (tac < 4) return { pts: 25, target: "4-7", guideline: "AASLD 2021/2023" };
    if (tac > 7) return { pts: 25, target: "4-7", guideline: "AASLD 2021/2023" };
  }
  return { pts: 0, target: days <= 30 ? "8-10" : days <= 180 ? "6-8" : "4-7", guideline: "AASLD 2021/2023" };
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
  historicalLabs?: HistoricalLabInput
): Promise<{ score: number; level: string; flags: string[]; explanations: RiskExplanation[] }> {
  let thresholds: ClinicalThreshold[] = [];
  try {
    thresholds = await fetchClinicalThresholds();
  } catch (e) {
    console.warn("Failed to fetch thresholds, using fallback:", e);
  }

  const organThresholds = thresholds.filter((t) => t.organ_type === organType);

  if (organThresholds.length > 0) {
    return computeRiskWithDbThresholds(organType, lab, patient, historicalLabs, organThresholds);
  }

  return computeRiskScore(organType, lab, patient, historicalLabs);
}

function computeRiskWithDbThresholds(
  organType: string,
  lab: LabResult,
  patient: { transplant_number?: number | null; dialysis_history?: boolean | null; transplant_date?: string | null },
  historicalLabs: HistoricalLabInput,
  thresholds: ClinicalThreshold[]
): { score: number; level: string; flags: string[]; explanations: RiskExplanation[] } {
  let score = 0;
  const flags: string[] = [];
  const explanations: RiskExplanation[] = [];
  const trendHistory = normalizeHistoricalLabs(historicalLabs);

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

  const labParamMap: Record<string, number | null | undefined> = {
    tacrolimus: lab.tacrolimus_level,
    alt: lab.alt, ast: lab.ast,
    total_bilirubin: lab.total_bilirubin, direct_bilirubin: lab.direct_bilirubin,
    creatinine: lab.creatinine, egfr: lab.egfr, potassium: lab.potassium,
    proteinuria: lab.proteinuria, hb: lab.hb, albumin: lab.albumin,
    platelets: lab.platelets, inr: lab.inr, alp: lab.alp, ggt: lab.ggt, crp: lab.crp,
  };

  // ── Time-dependent Tacrolimus scoring (skip DB threshold for tacrolimus) ──
  const tac = lab.tacrolimus_level ?? 0;
  if (tac > 0) {
    const tacResult = organType === "liver"
      ? liverTacrolimusScore(tac, daysSinceTx)
      : kidneyTacrolimusScore(tac, daysSinceTx);

    if (tacResult.pts > 0) {
      score += tacResult.pts;
      const stage = daysSinceTx !== null
        ? `${daysSinceTx} days post-transplant`
        : "unknown stage";
      flags.push(`Tacrolimus ${tac} ng/mL outside target [${tacResult.target}]`);
      explanations.push({
        key: tac < parseFloat(tacResult.target.split("-")[0]) ? "tacrolimus_low" : "tacrolimus_high",
        message: `Tacrolimus ${tac} ng/mL is outside the target range [${tacResult.target} ng/mL] for your current transplant stage (${stage}). Based on ${tacResult.guideline}.`,
        severity: "critical",
        value: tac,
        guideline: tacResult.guideline,
      });
    }
  }

  // ── Evaluate other thresholds from DB (skip tacrolimus — handled above) ──
  for (const threshold of thresholds) {
    if (threshold.parameter === "tacrolimus") continue;
    const paramKey = threshold.parameter;
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

    // ── Enhanced ALT/AST trend: >50% vs median of last 3 → +30 pts (AASLD) ──
    if ((threshold.parameter === "alt" || threshold.parameter === "ast") && organType === "liver") {
      const altAstTrend = getWindowTrendSignal(value, trendHistory, threshold.parameter, 50, "up");
      if (altAstTrend) {
        score += 30;
        flags.push(`${threshold.parameter.toUpperCase()} rapid increase: +${Math.abs(altAstTrend.change_pct).toFixed(0)}%`);
        explanations.push({
          key: `${threshold.parameter}_trend_up`,
          message: `${threshold.parameter.toUpperCase()} increased by ${Math.abs(altAstTrend.change_pct).toFixed(0)}% vs median of last ${altAstTrend.sample_count} tests — Acute Injury/Rejection suspicion (AASLD 2021/2023)`,
          severity: "critical",
          change_pct: altAstTrend.change_pct,
          guideline: "AASLD 2021/2023",
        });
        continue; // skip generic trend below for this parameter
      }
    }

    if (threshold.trend_threshold_pct != null) {
      const trendSignal = getWindowTrendSignal(value, trendHistory, threshold.parameter, threshold.trend_threshold_pct, threshold.trend_direction);

      if (trendSignal) {
        const trendPoints = Math.round(threshold.risk_points_warning * 0.75);
        score += trendPoints;
        flags.push(`${threshold.parameter} ${trendSignal.direction}: ${Math.abs(trendSignal.change_pct).toFixed(0)}%`);
        explanations.push({
          key: `${threshold.parameter}_trend`,
          message: `${threshold.parameter.toUpperCase()} ${trendSignal.direction} by ${Math.abs(trendSignal.change_pct).toFixed(0)}% vs median of previous ${trendSignal.sample_count} test(s) (${trendSignal.baseline} → ${value})`,
          severity: trendSignal.direction === "increased" ? "critical" : "warning",
          change_pct: trendSignal.change_pct,
          guideline: `${threshold.guideline_source} ${threshold.guideline_year}`,
        });
      }
    }
  }

  // ── Baseline-relative creatinine for kidney (KDIGO 2009) ──
  if (organType === "kidney" && lab.creatinine && lab.creatinine > 0 && trendHistory.length > 0) {
    const allCreatinineValues = trendHistory
      .map((l) => l.creatinine)
      .filter((v): v is number => v != null && v > 0);
    if (allCreatinineValues.length > 0) {
      const bestCr = Math.min(...allCreatinineValues);
      if (lab.creatinine > bestCr * 1.25) {
        score += 35;
        flags.push(`Creatinine >25% above baseline (${bestCr} → ${lab.creatinine})`);
        explanations.push({
          key: "cr_baseline_alert",
          message: `Creatinine ${lab.creatinine} mg/dL is >25% above best post-transplant baseline of ${bestCr} mg/dL — Immediate Rejection Alert (KDIGO 2009)`,
          severity: "critical",
          value: lab.creatinine,
          threshold: bestCr * 1.25,
          guideline: "KDIGO 2009",
        });
      }
    }
  }

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
 * Now includes time-dependent tacrolimus windows.
 */
export function computeRiskScore(
  organType: string,
  lab: LabResult,
  patient: {
    transplant_number?: number | null;
    dialysis_history?: boolean | null;
    transplant_date?: string | null;
  },
  historicalLabs?: HistoricalLabInput
): { score: number; level: string; flags: string[]; explanations: RiskExplanation[] } {
  let score = 0;
  const flags: string[] = [];
  const explanations: RiskExplanation[] = [];
  const trendHistory = normalizeHistoricalLabs(historicalLabs);

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
    // Time-dependent tacrolimus
    const tacResult = liverTacrolimusScore(tac, daysSinceTx);
    if (tacResult.pts > 0) {
      score += tacResult.pts;
      flags.push(`Tacrolimus ${tac} outside [${tacResult.target}]`);
      explanations.push({ key: tac < 5 ? "tacrolimus_low" : "tacrolimus_high", message: `Tacrolimus ${tac} ng/mL outside target [${tacResult.target}] (${tacResult.guideline})`, severity: "critical", value: tac, guideline: tacResult.guideline });
    }

    if (alt > FALLBACK_THRESHOLDS.alt.critical) { score += 30; flags.push(`ALT critical: ${alt}`); explanations.push({ key: "alt_critical", message: `ALT ${alt} U/L critically elevated`, severity: "critical", value: alt, threshold: FALLBACK_THRESHOLDS.alt.critical }); }
    else if (alt > FALLBACK_THRESHOLDS.alt.warning) { score += 15; flags.push(`ALT elevated: ${alt}`); explanations.push({ key: "alt_elevated", message: `ALT ${alt} U/L elevated`, severity: "warning", value: alt, threshold: FALLBACK_THRESHOLDS.alt.warning }); }
    if (ast > FALLBACK_THRESHOLDS.ast.critical) { score += 25; flags.push(`AST critical: ${ast}`); explanations.push({ key: "ast_critical", message: `AST ${ast} U/L critically elevated`, severity: "critical", value: ast, threshold: FALLBACK_THRESHOLDS.ast.critical }); }
    else if (ast > FALLBACK_THRESHOLDS.ast.warning) { score += 10; flags.push(`AST elevated: ${ast}`); explanations.push({ key: "ast_elevated", message: `AST ${ast} U/L elevated`, severity: "warning", value: ast, threshold: FALLBACK_THRESHOLDS.ast.warning }); }
    if (bili > FALLBACK_THRESHOLDS.total_bilirubin.critical) { score += 20; flags.push(`Bilirubin critical: ${bili}`); explanations.push({ key: "bilirubin_critical", message: `Bilirubin ${bili} mg/dL critically high`, severity: "critical", value: bili, threshold: FALLBACK_THRESHOLDS.total_bilirubin.critical }); }
    else if (bili > FALLBACK_THRESHOLDS.total_bilirubin.warning) { score += 10; flags.push(`Bilirubin elevated: ${bili}`); explanations.push({ key: "bilirubin_elevated", message: `Bilirubin ${bili} mg/dL elevated`, severity: "warning", value: bili, threshold: FALLBACK_THRESHOLDS.total_bilirubin.warning }); }
    if ((patient.transplant_number ?? 1) >= 2) { score += 15; flags.push("Re-transplant patient"); explanations.push({ key: "retransplant", message: "Re-transplant patient — higher baseline risk", severity: "warning" }); }

    // Enhanced ALT/AST trend: >50% vs median of last 3 → +30 (AASLD)
    const altTrend = getWindowTrendSignal(alt, trendHistory, "alt", 50, "up");
    if (altTrend) {
      score += 30;
      flags.push(`ALT rapid increase: +${Math.abs(altTrend.change_pct).toFixed(0)}%`);
      explanations.push({ key: "alt_trend_up", message: `ALT increased ${Math.abs(altTrend.change_pct).toFixed(0)}% vs median of last ${altTrend.sample_count} tests — Acute Injury/Rejection suspicion (AASLD 2021/2023)`, severity: "critical", change_pct: altTrend.change_pct, guideline: "AASLD 2021/2023" });
    }

    const astTrend = getWindowTrendSignal(ast, trendHistory, "ast", 50, "up");
    if (astTrend) {
      score += 30;
      flags.push(`AST rapid increase: +${Math.abs(astTrend.change_pct).toFixed(0)}%`);
      explanations.push({ key: "ast_trend_up", message: `AST increased ${Math.abs(astTrend.change_pct).toFixed(0)}% vs median of last ${astTrend.sample_count} tests — Acute Injury/Rejection suspicion (AASLD 2021/2023)`, severity: "critical", change_pct: astTrend.change_pct, guideline: "AASLD 2021/2023" });
    }

    const tacTrend = getWindowTrendSignal(tac, trendHistory, "tacrolimus", 30, "down");
    if (tacTrend) {
      score += 10;
      flags.push(`Tacrolimus dropped: ${tacTrend.change_pct.toFixed(0)}%`);
      explanations.push({ key: "tac_trend_down", message: `Tacrolimus dropped ${Math.abs(tacTrend.change_pct).toFixed(0)}% vs median of previous ${tacTrend.sample_count} test(s)`, severity: "warning", change_pct: tacTrend.change_pct });
    }
  } else {
    // Time-dependent tacrolimus for kidney
    const tacResult = kidneyTacrolimusScore(tac, daysSinceTx);
    if (tacResult.pts > 0) {
      score += tacResult.pts;
      flags.push(`Tacrolimus ${tac} outside [${tacResult.target}]`);
      explanations.push({ key: tac < 5 ? "tacrolimus_low" : "tacrolimus_high", message: `Tacrolimus ${tac} ng/mL outside target [${tacResult.target}] (${tacResult.guideline})`, severity: "critical", value: tac, guideline: tacResult.guideline });
    }

    if (cr > FALLBACK_THRESHOLDS.creatinine.critical) { score += 35; flags.push(`Creatinine critical: ${cr}`); explanations.push({ key: "creatinine_critical", message: `Creatinine ${cr} mg/dL critically elevated`, severity: "critical", value: cr, threshold: FALLBACK_THRESHOLDS.creatinine.critical }); }
    else if (cr > FALLBACK_THRESHOLDS.creatinine.warning) { score += 15; flags.push(`Creatinine elevated: ${cr}`); explanations.push({ key: "creatinine_elevated", message: `Creatinine ${cr} mg/dL elevated`, severity: "warning", value: cr, threshold: FALLBACK_THRESHOLDS.creatinine.warning }); }

    // Baseline-relative creatinine (KDIGO 2009)
    if (cr > 0 && trendHistory.length > 0) {
      const allCr = trendHistory.map((l) => l.creatinine).filter((v): v is number => v != null && v > 0);
      if (allCr.length > 0) {
        const bestCr = Math.min(...allCr);
        if (cr > bestCr * 1.25) {
          score += 35;
          flags.push(`Creatinine >25% above baseline (${bestCr} → ${cr})`);
          explanations.push({ key: "cr_baseline_alert", message: `Creatinine ${cr} mg/dL is >25% above best post-transplant baseline of ${bestCr} mg/dL — Immediate Rejection Alert (KDIGO 2009)`, severity: "critical", value: cr, threshold: bestCr * 1.25, guideline: "KDIGO 2009" });
        }
      }
    }

    if (egfr < 30) { score += 30; flags.push(`eGFR very low: ${egfr}`); explanations.push({ key: "egfr_very_low", message: `eGFR ${egfr} severe impairment`, severity: "critical", value: egfr, threshold: 30 }); }
    else if (egfr < 45) { score += 15; flags.push(`eGFR low: ${egfr}`); explanations.push({ key: "egfr_low", message: `eGFR ${egfr} moderate impairment`, severity: "warning", value: egfr, threshold: 45 }); }

    if (patient.dialysis_history) { score += 20; flags.push("Dialysis history"); explanations.push({ key: "dialysis_history", message: "History of dialysis", severity: "warning" }); }
    const creatinineTrend = getWindowTrendSignal(cr, trendHistory, "creatinine", 30, "up");
    if (creatinineTrend) {
      score += 15;
      flags.push(`Creatinine rapid increase: +${Math.abs(creatinineTrend.change_pct).toFixed(0)}%`);
      explanations.push({ key: "cr_trend_up", message: `Creatinine increased ${Math.abs(creatinineTrend.change_pct).toFixed(0)}% vs median of previous ${creatinineTrend.sample_count} test(s)`, severity: "critical", change_pct: creatinineTrend.change_pct });
    }

    const egfrTrend = getWindowTrendSignal(egfr, trendHistory, "egfr", 20, "down");
    if (egfrTrend) {
      score += 10;
      flags.push(`eGFR declining: ${egfrTrend.change_pct.toFixed(0)}%`);
      explanations.push({ key: "egfr_trend_down", message: `eGFR declined ${Math.abs(egfrTrend.change_pct).toFixed(0)}% vs median of previous ${egfrTrend.sample_count} test(s)`, severity: "warning", change_pct: egfrTrend.change_pct });
    }
    const abnormalCount = [cr > FALLBACK_THRESHOLDS.creatinine.warning, egfr < 45, tacResult.pts > 0].filter(Boolean).length;
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
  details?: RiskDetails;
  trend_flags?: string[];
  algorithm_version?: string;
}) {
  const payload = {
    patient_id: data.patient_id,
    lab_result_id: data.lab_result_id ?? null,
    score: data.score,
    risk_level: data.risk_level,
    creatinine: data.creatinine ?? null,
    alt: data.alt ?? null,
    ast: data.ast ?? null,
    total_bilirubin: data.total_bilirubin ?? null,
    tacrolimus_level: data.tacrolimus_level ?? null,
    details: (data.details ?? {}) as unknown as Record<string, string>,
    trend_flags: (data.trend_flags ?? []) as unknown as string,
    algorithm_version: data.algorithm_version ?? CURRENT_ALGORITHM_VERSION,
  } satisfies TablesInsert<"risk_snapshots">;

  const { data: result, error } = await supabase
    .from("risk_snapshots")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert risk snapshot:", error);
    throw error;
  }

  return result;
}

export async function fetchRiskSnapshots(patientId: string): Promise<RiskSnapshot[]> {
  const { data, error } = await supabase
    .from("risk_snapshots")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch risk snapshots:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    patient_id: row.patient_id,
    lab_result_id: row.lab_result_id,
    score: Number(row.score),
    risk_level: row.risk_level,
    creatinine: row.creatinine != null ? Number(row.creatinine) : null,
    alt: row.alt != null ? Number(row.alt) : null,
    ast: row.ast != null ? Number(row.ast) : null,
    total_bilirubin: row.total_bilirubin != null ? Number(row.total_bilirubin) : null,
    tacrolimus_level: row.tacrolimus_level != null ? Number(row.tacrolimus_level) : null,
    details: (row.details ?? {}) as RiskDetails,
    trend_flags: Array.isArray(row.trend_flags) ? row.trend_flags as string[] : [],
    algorithm_version: row.algorithm_version ?? "unknown",
    created_at: row.created_at,
  }));
}
