import { supabase } from "@/integrations/supabase/client";
import type { LabResult } from "@/types/patient";

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
  created_at: string;
}

// Clinical risk thresholds
const THRESHOLDS = {
  creatinine: { warning: 1.5, critical: 2.5 },
  alt: { warning: 60, critical: 120 },
  ast: { warning: 60, critical: 120 },
  total_bilirubin: { warning: 1.5, critical: 3.0 },
  tacrolimus: { low: 5, high: 15 },
};

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

export interface RiskExplanation {
  key: string;       // machine-readable key for i18n
  message: string;   // human-readable explanation
  severity: "critical" | "warning" | "info";
  value?: number;
  threshold?: number;
  change_pct?: number;
}

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

  // --- Time since transplant factor ---
  const daysSinceTx = daysSinceDate(patient.transplant_date);
  if (daysSinceTx !== null && daysSinceTx < 90) {
    score += 10;
    flags.push(`Early post-transplant: ${daysSinceTx} days`);
    explanations.push({
      key: "early_post_tx",
      message: `Patient is ${daysSinceTx} days post-transplant (< 90 days), higher rejection risk`,
      severity: "warning",
      value: daysSinceTx,
    });
  }

  if (organType === "liver") {
    // Tacrolimus
    if (tac < THRESHOLDS.tacrolimus.low) {
      score += 30; flags.push(`Tacrolimus low: ${tac}`);
      explanations.push({ key: "tacrolimus_low", message: `Tacrolimus level ${tac} ng/mL is below therapeutic range (< ${THRESHOLDS.tacrolimus.low})`, severity: "critical", value: tac, threshold: THRESHOLDS.tacrolimus.low });
    } else if (tac > THRESHOLDS.tacrolimus.high) {
      score += 20; flags.push(`Tacrolimus high: ${tac}`);
      explanations.push({ key: "tacrolimus_high", message: `Tacrolimus level ${tac} ng/mL exceeds safe range (> ${THRESHOLDS.tacrolimus.high})`, severity: "warning", value: tac, threshold: THRESHOLDS.tacrolimus.high });
    }

    // ALT
    if (alt > THRESHOLDS.alt.critical) {
      score += 30; flags.push(`ALT critical: ${alt}`);
      explanations.push({ key: "alt_critical", message: `ALT ${alt} U/L is critically elevated (> ${THRESHOLDS.alt.critical})`, severity: "critical", value: alt, threshold: THRESHOLDS.alt.critical });
    } else if (alt > THRESHOLDS.alt.warning) {
      score += 15; flags.push(`ALT elevated: ${alt}`);
      explanations.push({ key: "alt_elevated", message: `ALT ${alt} U/L is above normal (> ${THRESHOLDS.alt.warning})`, severity: "warning", value: alt, threshold: THRESHOLDS.alt.warning });
    }

    // AST
    if (ast > THRESHOLDS.ast.critical) {
      score += 25; flags.push(`AST critical: ${ast}`);
      explanations.push({ key: "ast_critical", message: `AST ${ast} U/L is critically elevated (> ${THRESHOLDS.ast.critical})`, severity: "critical", value: ast, threshold: THRESHOLDS.ast.critical });
    } else if (ast > THRESHOLDS.ast.warning) {
      score += 10; flags.push(`AST elevated: ${ast}`);
      explanations.push({ key: "ast_elevated", message: `AST ${ast} U/L is above normal (> ${THRESHOLDS.ast.warning})`, severity: "warning", value: ast, threshold: THRESHOLDS.ast.warning });
    }

    // Bilirubin
    if (bili > THRESHOLDS.total_bilirubin.critical) {
      score += 20; flags.push(`Bilirubin critical: ${bili}`);
      explanations.push({ key: "bilirubin_critical", message: `Total bilirubin ${bili} mg/dL is critically high (> ${THRESHOLDS.total_bilirubin.critical})`, severity: "critical", value: bili, threshold: THRESHOLDS.total_bilirubin.critical });
    } else if (bili > THRESHOLDS.total_bilirubin.warning) {
      score += 10; flags.push(`Bilirubin elevated: ${bili}`);
      explanations.push({ key: "bilirubin_elevated", message: `Total bilirubin ${bili} mg/dL is elevated (> ${THRESHOLDS.total_bilirubin.warning})`, severity: "warning", value: bili, threshold: THRESHOLDS.total_bilirubin.warning });
    }

    // Transplant number multiplier
    if ((patient.transplant_number ?? 1) >= 2) {
      score += 15; flags.push("Re-transplant patient");
      explanations.push({ key: "retransplant", message: "Re-transplant patient — higher baseline rejection risk", severity: "warning" });
    }

    // --- Trend analysis for liver ---
    if (prevLab) {
      const prevAlt = prevLab.alt ?? 0;
      if (prevAlt > 0 && alt > 0) {
        const change = pctChange(prevAlt, alt);
        if (change >= 40) {
          score += 15; flags.push(`ALT rapid increase: +${change.toFixed(0)}%`);
          explanations.push({ key: "alt_trend_up", message: `ALT increased by ${change.toFixed(0)}% since last test (${prevAlt} → ${alt})`, severity: "critical", change_pct: change });
        }
      }
      const prevTac = prevLab.tacrolimus_level ?? 0;
      if (prevTac > 0 && tac > 0) {
        const change = pctChange(prevTac, tac);
        if (change <= -30) {
          score += 10; flags.push(`Tacrolimus dropped: ${change.toFixed(0)}%`);
          explanations.push({ key: "tac_trend_down", message: `Tacrolimus dropped by ${Math.abs(change).toFixed(0)}% since last test (${prevTac} → ${tac})`, severity: "warning", change_pct: change });
        }
      }
    }
  } else {
    // Kidney
    if (cr > THRESHOLDS.creatinine.critical) {
      score += 35; flags.push(`Creatinine critical: ${cr}`);
      explanations.push({ key: "creatinine_critical", message: `Creatinine ${cr} mg/dL is critically elevated (> ${THRESHOLDS.creatinine.critical})`, severity: "critical", value: cr, threshold: THRESHOLDS.creatinine.critical });
    } else if (cr > THRESHOLDS.creatinine.warning) {
      score += 15; flags.push(`Creatinine elevated: ${cr}`);
      explanations.push({ key: "creatinine_elevated", message: `Creatinine ${cr} mg/dL is above normal (> ${THRESHOLDS.creatinine.warning})`, severity: "warning", value: cr, threshold: THRESHOLDS.creatinine.warning });
    }

    if (egfr < 30) {
      score += 30; flags.push(`eGFR very low: ${egfr}`);
      explanations.push({ key: "egfr_very_low", message: `eGFR ${egfr} indicates severe renal impairment (< 30)`, severity: "critical", value: egfr, threshold: 30 });
    } else if (egfr < 45) {
      score += 15; flags.push(`eGFR low: ${egfr}`);
      explanations.push({ key: "egfr_low", message: `eGFR ${egfr} indicates moderate renal impairment (< 45)`, severity: "warning", value: egfr, threshold: 45 });
    }

    if (tac < THRESHOLDS.tacrolimus.low) {
      score += 20; flags.push(`Tacrolimus low: ${tac}`);
      explanations.push({ key: "tacrolimus_low", message: `Tacrolimus level ${tac} ng/mL is below therapeutic range (< ${THRESHOLDS.tacrolimus.low})`, severity: "critical", value: tac, threshold: THRESHOLDS.tacrolimus.low });
    } else if (tac > THRESHOLDS.tacrolimus.high) {
      score += 15; flags.push(`Tacrolimus high: ${tac}`);
      explanations.push({ key: "tacrolimus_high", message: `Tacrolimus level ${tac} ng/mL exceeds safe range (> ${THRESHOLDS.tacrolimus.high})`, severity: "warning", value: tac, threshold: THRESHOLDS.tacrolimus.high });
    }

    if (patient.dialysis_history) {
      score += 20; flags.push("Dialysis history");
      explanations.push({ key: "dialysis_history", message: "History of dialysis — higher baseline risk", severity: "warning" });
    }

    // --- Trend analysis for kidney ---
    if (prevLab) {
      const prevCr = prevLab.creatinine ?? 0;
      if (prevCr > 0 && cr > 0) {
        const change = pctChange(prevCr, cr);
        if (change >= 30) {
          score += 15; flags.push(`Creatinine rapid increase: +${change.toFixed(0)}%`);
          explanations.push({ key: "cr_trend_up", message: `Creatinine increased by ${change.toFixed(0)}% since last test (${prevCr} → ${cr})`, severity: "critical", change_pct: change });
        }
      }
      const prevEgfr = prevLab.egfr ?? 999;
      if (prevEgfr < 900 && egfr < 900) {
        const change = pctChange(prevEgfr, egfr);
        if (change <= -20) {
          score += 10; flags.push(`eGFR declining: ${change.toFixed(0)}%`);
          explanations.push({ key: "egfr_trend_down", message: `eGFR declined by ${Math.abs(change).toFixed(0)}% since last test (${prevEgfr} → ${egfr})`, severity: "warning", change_pct: change });
        }
      }
    }

    // Multiple abnormal labs bonus
    const abnormalCount = [
      cr > THRESHOLDS.creatinine.warning,
      egfr < 45,
      tac < THRESHOLDS.tacrolimus.low || tac > THRESHOLDS.tacrolimus.high,
    ].filter(Boolean).length;
    if (abnormalCount >= 2) {
      score += 10; flags.push(`Multiple abnormal values: ${abnormalCount}`);
      explanations.push({ key: "multiple_abnormal", message: `${abnormalCount} lab values are simultaneously abnormal`, severity: "warning" });
    }
  }

  // Cap at 100
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
  // Join with lab_results to order by the lab's recorded_at (not snapshot created_at)
  // This ensures the latest LAB's snapshot appears first, even if an older lab's snapshot was re-created later
  const { data, error } = await supabase
    .from("risk_snapshots")
    .select("*, lab_results!risk_snapshots_lab_result_id_fkey(recorded_at)")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(limit * 2); // fetch extra to deduplicate
  if (error) throw error;

  // Sort by lab recorded_at (descending), then by created_at (descending) for same lab
  const rows = (data ?? []) as (RiskSnapshot & { lab_results?: { recorded_at: string } | null })[];
  rows.sort((a, b) => {
    const aDate = a.lab_results?.recorded_at ?? a.created_at;
    const bDate = b.lab_results?.recorded_at ?? b.created_at;
    const diff = new Date(bDate).getTime() - new Date(aDate).getTime();
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Deduplicate: keep only latest snapshot per lab_result_id
  const seen = new Set<string>();
  const unique: RiskSnapshot[] = [];
  for (const row of rows) {
    const key = row.lab_result_id ?? row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    // Strip joined data before returning
    const { lab_results: _, ...snapshot } = row as any;
    unique.push(snapshot);
    if (unique.length >= limit) break;
  }

  return unique;
}

export async function fetchLatestRiskSnapshot(patientId: string) {
  const snapshots = await fetchRiskSnapshots(patientId, 1);
  return snapshots[0] ?? null;
}
