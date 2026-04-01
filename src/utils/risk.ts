import type { OrganType, RiskLevel } from "@/types/patient";

/**
 * Deterministic risk calculation with organ-specific algorithms.
 * Returns a RiskLevel based on a normalized 0-100 scoring system.
 *
 * LIVER MODEL: ALT, AST, Total Bilirubin, Direct Bilirubin, GGT, ALP, Tacrolimus, Transplant #, Days post-Tx
 * KIDNEY MODEL: Creatinine, eGFR, Proteinuria, Potassium, Tacrolimus, Dialysis history, Days post-Tx
 * FUTURE KIDNEY MARKERS: BK virus, CMV, Donor-specific antibodies (DSA)
 */
export function calculateRisk(organ: OrganType, data: Record<string, number | string | boolean | null | undefined>): RiskLevel {
  const score = calculateRiskScore(organ, data);
  return score >= 60 ? "high" : score >= 30 ? "medium" : "low";
}

/**
 * Full 0-100 risk score calculator with organ-specific logic.
 */
export function calculateRiskScore(organ: OrganType, data: Record<string, any>): number {
  let score = 0;

  // ── Blood type incompatibility ──
  const bloodMismatch = data.blood_type && data.donor_blood_type && data.blood_type !== data.donor_blood_type;
  const titerDone = data.titer_therapy === "yes" || data.titer_therapy === true;
  if (bloodMismatch && !titerDone) score += 25;
  else if (bloodMismatch && titerDone) score += 10;

  // ── Early post-transplant period (<90 days) ──
  if (data.transplant_date) {
    const daysSinceTx = Math.floor((Date.now() - new Date(data.transplant_date).getTime()) / 86400000);
    if (daysSinceTx >= 0 && daysSinceTx < 90) {
      score += 10;
    }
  }

  // ── Re-transplant ──
  const txNum = parseInt(data.transplant_number) || 1;
  if (txNum >= 2) score += 15;

  if (organ === "liver") {
    score += liverRiskModel(data);
  } else {
    score += kidneyRiskModel(data);
  }

  return Math.min(score, 100);
}

// ─── LIVER-SPECIFIC RISK MODEL ───
function liverRiskModel(data: Record<string, number | string | boolean | null | undefined>): number {
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

  // Total Bilirubin (mg/dL) — normalized, with severe tier
  if (bili > 10.0) pts += 30;
  else if (bili > 3.0) pts += 20;
  else if (bili > 1.5) pts += 10;

  // Direct Bilirubin (mg/dL)
  if (dbili > 1.5) pts += 10;
  else if (dbili > 0.5) pts += 5;

  // GGT (U/L) — biliary/cholestatic rejection marker, severe tier
  if (ggt > 500) pts += 20;
  else if (ggt > 200) pts += 15;
  else if (ggt > 60) pts += 8;

  // ALP (U/L) — biliary obstruction/rejection marker
  if (alp > 300) pts += 15;
  else if (alp > 120) pts += 8;

  // Tacrolimus (ng/mL) — ISHLT 2023
  if (tac > 0) {
    if (tac < 5) pts += 25;      // sub-therapeutic → high rejection risk
    else if (tac > 15) pts += 15; // toxic range
  }

  return pts;
}

// ─── KIDNEY-SPECIFIC RISK MODEL ───
function kidneyRiskModel(data: Record<string, any>): number {
  let pts = 0;
  const cr = parseFloat(data.creatinine) || 0;
  const egfr = parseFloat(data.egfr) || 999;
  const prot = parseFloat(data.proteinuria) || 0;
  const k = parseFloat(data.potassium) || 0;
  const tac = parseFloat(data.tacrolimus_level) || 0;
  const dialysis = data.dialysis_history === "yes" || data.dialysis_history === true;

  // Creatinine (mg/dL) — KDIGO 2024
  if (cr > 2.5) pts += 30;
  else if (cr > 1.5) pts += 12;

  // eGFR (mL/min/1.73m²)
  if (egfr < 30) pts += 25;
  else if (egfr < 45) pts += 12;

  // Proteinuria (g/day)
  if (prot > 1.0) pts += 15;
  else if (prot > 0.3) pts += 8;

  // Potassium (mmol/L)
  if (k > 6.0) pts += 15;
  else if (k > 5.5 || (k > 0 && k < 3.5)) pts += 8;

  // Tacrolimus (ng/mL)
  if (tac > 0) {
    if (tac < 5) pts += 20;
    else if (tac > 15) pts += 12;
  }

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
