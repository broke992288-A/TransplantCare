import type { OrganType, RiskLevel } from "@/types/patient";

/**
 * Deterministic risk calculation with organ-specific algorithms.
 * Returns a RiskLevel based on a normalized 0-100 scoring system.
 *
 * LIVER MODEL (AASLD 2021/2023): ALT, AST, Total Bilirubin, Direct Bilirubin, GGT, ALP, Tacrolimus (time-dependent), Transplant #, Days post-Tx
 * KIDNEY MODEL (KDIGO 2009/2024): Creatinine (absolute + baseline-relative), eGFR, Proteinuria, Potassium, Tacrolimus (time-dependent), Dialysis history, Days post-Tx
 */
export function calculateRisk(organ: OrganType, data: Record<string, number | string | boolean | null | undefined>): RiskLevel {
  const score = calculateRiskScore(organ, data);
  return score >= 60 ? "high" : score >= 30 ? "medium" : "low";
}

/**
 * Get days since transplant from data.
 */
function getDaysSinceTx(data: Record<string, number | string | boolean | null | undefined>): number | null {
  if (!data.transplant_date) return null;
  const d = Math.floor((Date.now() - new Date(String(data.transplant_date)).getTime()) / 86400000);
  return d >= 0 ? d : null;
}

/**
 * Time-dependent Tacrolimus scoring for Kidney (KDIGO 2009/2024).
 */
function kidneyTacrolimusScore(tac: number, daysSinceTx: number | null): { pts: number; target: string; guideline: string } {
  if (tac <= 0) return { pts: 0, target: "", guideline: "KDIGO 2009/2024" };
  const days = daysSinceTx ?? 999;

  if (days <= 90) {
    // 0-90 days: Target [8–12 ng/ml]
    if (tac < 8) return { pts: 20, target: "8-12", guideline: "KDIGO 2009/2024" };
    if (tac > 12) return { pts: 15, target: "8-12", guideline: "KDIGO 2009/2024" };
  } else if (days <= 365) {
    // 90-365 days: Target [6–8 ng/ml]
    if (tac < 6) return { pts: 20, target: "6-8", guideline: "KDIGO 2009/2024" };
    if (tac > 8) return { pts: 20, target: "6-8", guideline: "KDIGO 2009/2024" };
  } else {
    // >365 days: Target [4–6 ng/ml]
    if (tac < 4) return { pts: 25, target: "4-6", guideline: "KDIGO 2009/2024" };
    if (tac > 6) return { pts: 25, target: "4-6", guideline: "KDIGO 2009/2024" };
  }
  return { pts: 0, target: days <= 90 ? "8-12" : days <= 365 ? "6-8" : "4-6", guideline: "KDIGO 2009/2024" };
}

/**
 * Time-dependent Tacrolimus scoring for Liver (AASLD 2021/2023).
 */
function liverTacrolimusScore(tac: number, daysSinceTx: number | null): { pts: number; target: string; guideline: string } {
  if (tac <= 0) return { pts: 0, target: "", guideline: "AASLD 2021/2023" };
  const days = daysSinceTx ?? 999;

  if (days <= 30) {
    // 0-30 days: Target [8–10 ng/ml]
    if (tac < 8) return { pts: 25, target: "8-10", guideline: "AASLD 2021/2023" };
    if (tac > 10) return { pts: 15, target: "8-10", guideline: "AASLD 2021/2023" };
  } else if (days <= 180) {
    // 30-180 days: Target [6–8 ng/ml]
    if (tac < 6) return { pts: 20, target: "6-8", guideline: "AASLD 2021/2023" };
    if (tac > 8) return { pts: 20, target: "6-8", guideline: "AASLD 2021/2023" };
  } else {
    // >180 days: Target [4–7 ng/ml]
    if (tac < 4) return { pts: 25, target: "4-7", guideline: "AASLD 2021/2023" };
    if (tac > 7) return { pts: 25, target: "4-7", guideline: "AASLD 2021/2023" };
  }
  return { pts: 0, target: days <= 30 ? "8-10" : days <= 180 ? "6-8" : "4-7", guideline: "AASLD 2021/2023" };
}

/**
 * Full 0-100 risk score calculator with organ-specific logic.
 */
export function calculateRiskScore(organ: OrganType, data: Record<string, number | string | boolean | null | undefined>): number {
  let score = 0;
  const daysSinceTx = getDaysSinceTx(data);

  // ── Blood type incompatibility ──
  const bloodMismatch = data.blood_type && data.donor_blood_type && data.blood_type !== data.donor_blood_type;
  const titerDone = data.titer_therapy === "yes" || data.titer_therapy === true;
  if (bloodMismatch && !titerDone) score += 25;
  else if (bloodMismatch && titerDone) score += 10;

  // ── Early post-transplant period (<90 days) ──
  if (daysSinceTx !== null && daysSinceTx < 90) {
    score += 10;
  }

  // ── Re-transplant ──
  const txNum = parseInt(String(data.transplant_number)) || 1;
  if (txNum >= 2) score += 15;

  if (organ === "liver") {
    score += liverRiskModel(data, daysSinceTx);
  } else {
    score += kidneyRiskModel(data, daysSinceTx);
  }

  return Math.min(score, 100);
}

// ─── LIVER-SPECIFIC RISK MODEL (AASLD 2021/2023) ───
function liverRiskModel(data: Record<string, number | string | boolean | null | undefined>, daysSinceTx: number | null): number {
  let pts = 0;
  const alt = parseFloat(String(data.alt ?? 0)) || 0;
  const ast = parseFloat(String(data.ast ?? 0)) || 0;
  const tac = parseFloat(String(data.tacrolimus_level ?? 0)) || 0;
  const bili = parseFloat(String(data.total_bilirubin ?? 0)) || 0;
  const dbili = parseFloat(String(data.direct_bilirubin ?? 0)) || 0;
  const ggt = parseFloat(String(data.ggt ?? 0)) || 0;
  const alp = parseFloat(String(data.alp ?? 0)) || 0;

  // ALT thresholds (U/L) — AASLD 2023, with severe acute rejection tiers
  if (alt > 800) pts += 40;
  else if (alt > 500) pts += 30;
  else if (alt > 120) pts += 25;
  else if (alt > 60) pts += 10;

  // AST thresholds (U/L) — severe tiers added
  if (ast > 500) pts += 25;
  else if (ast > 120) pts += 20;
  else if (ast > 60) pts += 8;

  // Total Bilirubin (mg/dL)
  if (bili > 10.0) pts += 30;
  else if (bili > 3.0) pts += 20;
  else if (bili > 1.5) pts += 10;

  // Direct Bilirubin (mg/dL)
  if (dbili > 1.5) pts += 10;
  else if (dbili > 0.5) pts += 5;

  // GGT (U/L) — biliary/cholestatic rejection marker
  if (ggt > 500) pts += 20;
  else if (ggt > 200) pts += 15;
  else if (ggt > 60) pts += 8;

  // ALP (U/L) — biliary obstruction/rejection marker
  if (alp > 300) pts += 15;
  else if (alp > 120) pts += 8;

  // Tacrolimus (ng/mL) — AASLD 2021/2023 time-dependent windows
  const tacResult = liverTacrolimusScore(tac, daysSinceTx);
  pts += tacResult.pts;

  return pts;
}

// ─── KIDNEY-SPECIFIC RISK MODEL (KDIGO 2009/2024) ───
function kidneyRiskModel(data: Record<string, number | string | boolean | null | undefined>, daysSinceTx: number | null): number {
  let pts = 0;
  const cr = parseFloat(String(data.creatinine ?? 0)) || 0;
  const egfr = parseFloat(String(data.egfr ?? 999)) || 999;
  const prot = parseFloat(String(data.proteinuria ?? 0)) || 0;
  const k = parseFloat(String(data.potassium ?? 0)) || 0;
  const tac = parseFloat(String(data.tacrolimus_level ?? 0)) || 0;
  const dialysis = data.dialysis_history === "yes" || data.dialysis_history === true;

  // Creatinine (mg/dL) — KDIGO 2024, with severe tier
  if (cr > 4.0) pts += 35;
  else if (cr > 2.5) pts += 30;
  else if (cr > 1.5) pts += 12;

  // Baseline-relative creatinine (KDIGO 2009): >25% above best → +35 pts
  const bestCr = parseFloat(String(data.best_creatinine ?? 0)) || 0;
  if (bestCr > 0 && cr > 0 && cr > bestCr * 1.25) {
    pts += 35;
  }

  // eGFR (mL/min/1.73m²) — severe tier
  if (egfr < 15) pts += 30;
  else if (egfr < 30) pts += 25;
  else if (egfr < 45) pts += 12;

  // Proteinuria (g/day) — nephrotic tier
  if (prot > 3.0) pts += 20;
  else if (prot > 1.0) pts += 15;
  else if (prot > 0.3) pts += 8;

  // Potassium (mmol/L)
  if (k > 6.0) pts += 15;
  else if (k > 5.5 || (k > 0 && k < 3.5)) pts += 8;

  // Tacrolimus (ng/mL) — KDIGO 2009/2024 time-dependent windows
  const tacResult = kidneyTacrolimusScore(tac, daysSinceTx);
  pts += tacResult.pts;

  // Dialysis history
  if (dialysis) pts += 20;

  return pts;
}

export function riskColorClass(level: string) {
  return level === "high"
    ? "bg-destructive text-destructive-foreground"
    : level === "medium"
      ? "bg-warning text-warning-foreground"
      : "bg-success text-success-foreground";
}

export function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function getAge(dob: string | null) {
  if (!dob) return "—";
  return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
}

// Export for use in other modules
export { kidneyTacrolimusScore, liverTacrolimusScore };
