import type { OrganType, RiskLevel } from "@/types/patient";

/**
 * Deterministic risk calculation with organ-specific algorithms.
 * Returns a RiskLevel based on a normalized 0-100 scoring system.
 *
 * LIVER MODEL (AASLD 2021/2023): ALT, AST, Total Bilirubin, Direct Bilirubin, GGT, ALP,
 *   Tacrolimus (time-dependent), INR, Platelets, Albumin, CRP, Hemoglobin, Calcium,
 *   Transplant #, Days post-Tx
 *
 * KIDNEY MODEL (KDIGO 2009/2024): Creatinine (absolute + baseline-relative), eGFR,
 *   Proteinuria, Potassium, Tacrolimus (time-dependent), BK Virus, CMV, DSA MFI,
 *   Urea, CRP, Hemoglobin, Calcium, Phosphorus, Magnesium,
 *   Dialysis history, Days post-Tx
 */
export function calculateRisk(organ: OrganType, data: Record<string, number | string | boolean | null | undefined>): RiskLevel {
  const score = calculateRiskScore(organ, data);
  return score >= 60 ? "high" : score >= 30 ? "medium" : "low";
}

/** Get days since transplant from data. */
function getDaysSinceTx(data: Record<string, number | string | boolean | null | undefined>): number | null {
  if (!data.transplant_date) return null;
  const d = Math.floor((Date.now() - new Date(String(data.transplant_date)).getTime()) / 86400000);
  return d >= 0 ? d : null;
}

/** Helper to parse a numeric field safely. */
function num(data: Record<string, number | string | boolean | null | undefined>, key: string, fallback = 0): number {
  return parseFloat(String(data[key] ?? fallback)) || fallback;
}

// ─── TACROLIMUS SCORING ───

/** Time-dependent Tacrolimus scoring for Kidney (KDIGO 2009/2024). */
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

/** Time-dependent Tacrolimus scoring for Liver (AASLD 2021/2023). */
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

// ─── SHARED SCORING HELPERS ───

/** Hemoglobin scoring — common to both organs. */
function hemoglobinScore(hb: number, organ: OrganType): number {
  if (hb <= 0) return 0;
  // KDIGO 2024 / AASLD 2023: Hb < 7 critical, < 10 warning
  if (hb < 7) return organ === "kidney" ? 20 : 15;
  if (hb < 10) return organ === "kidney" ? 10 : 5;
  return 0;
}

/** CRP scoring — inflammation marker (both organs). */
function crpScore(crp: number): number {
  if (crp <= 0) return 0;
  if (crp > 50) return 15;
  if (crp > 10) return 5;
  return 0;
}

/** Calcium scoring — KDIGO CKD-MBD 2024 / AASLD. */
function calciumScore(ca: number, organ: OrganType): number {
  if (ca <= 0) return 0;
  if (ca > 2.75) return organ === "kidney" ? 15 : 10;  // hypercalcemia
  if (ca < 2.0) return organ === "kidney" ? 8 : 5;     // hypocalcemia
  return 0;
}

// ─── MAIN RISK SCORE CALCULATOR ───

/** Full 0-100 risk score calculator with organ-specific logic. */
export function calculateRiskScore(organ: OrganType, data: Record<string, number | string | boolean | null | undefined>): number {
  let score = 0;
  const daysSinceTx = getDaysSinceTx(data);

  // ── Blood type incompatibility ──
  const bloodMismatch = data.blood_type && data.donor_blood_type && data.blood_type !== data.donor_blood_type;
  const titerDone = data.titer_therapy === "yes" || data.titer_therapy === true;
  if (bloodMismatch && !titerDone) score += 25;
  else if (bloodMismatch && titerDone) score += 10;

  // ── Early post-transplant period (<90 days) ──
  if (daysSinceTx !== null && daysSinceTx < 90) score += 10;

  // ── Re-transplant ──
  const txNum = parseInt(String(data.transplant_number)) || 1;
  if (txNum >= 2) score += 15;

  // ── Shared parameters (both organs) ──
  score += hemoglobinScore(num(data, "hb"), organ);
  score += crpScore(num(data, "crp"));
  score += calciumScore(num(data, "calcium"), organ);

  // ── Organ-specific models ──
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
  const alt = num(data, "alt");
  const ast = num(data, "ast");
  const tac = num(data, "tacrolimus_level");
  const bili = num(data, "total_bilirubin");
  const dbili = num(data, "direct_bilirubin");
  const ggt = num(data, "ggt");
  const alp = num(data, "alp");
  const inr = num(data, "inr");
  const platelets = num(data, "platelets");
  const albumin = num(data, "albumin");

  // ALT (U/L) — AASLD 2023
  if (alt > 800) pts += 40;
  else if (alt > 500) pts += 30;
  else if (alt > 120) pts += 25;
  else if (alt > 60) pts += 10;

  // AST (U/L)
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

  // GGT (U/L)
  if (ggt > 500) pts += 20;
  else if (ggt > 200) pts += 15;
  else if (ggt > 60) pts += 8;

  // ALP (U/L)
  if (alp > 300) pts += 15;
  else if (alp > 120) pts += 8;

  // INR — AASLD 2023 (coagulopathy marker)
  if (inr > 2.0) pts += 20;
  else if (inr > 1.5) pts += 10;

  // Platelets (x10³/µL) — AASLD 2023 (thrombocytopenia)
  if (platelets > 0 && platelets < 50) pts += 15;
  else if (platelets > 0 && platelets < 100) pts += 5;

  // Albumin (g/dL) — AASLD 2023 (synthetic function)
  if (albumin > 0 && albumin < 2.5) pts += 20;
  else if (albumin > 0 && albumin < 3.0) pts += 10;

  // Tacrolimus — AASLD 2021/2023 time-dependent windows
  pts += liverTacrolimusScore(tac, daysSinceTx).pts;

  return pts;
}

// ─── KIDNEY-SPECIFIC RISK MODEL (KDIGO 2009/2024) ───
function kidneyRiskModel(data: Record<string, number | string | boolean | null | undefined>, daysSinceTx: number | null): number {
  let pts = 0;
  const cr = num(data, "creatinine");
  const egfr = num(data, "egfr", 999);
  const prot = num(data, "proteinuria");
  const k = num(data, "potassium");
  const tac = num(data, "tacrolimus_level");
  const dialysis = data.dialysis_history === "yes" || data.dialysis_history === true;
  const bkVirus = num(data, "bk_virus_load");
  const cmv = num(data, "cmv_load");
  const dsaMfi = num(data, "dsa_mfi");
  const urea = num(data, "urea");
  const phosphorus = num(data, "phosphorus");
  const magnesium = num(data, "magnesium");

  // Creatinine (mg/dL) — KDIGO 2024
  if (cr > 4.0) pts += 35;
  else if (cr > 2.5) pts += 30;
  else if (cr > 1.5) pts += 12;

  // Baseline-relative creatinine (KDIGO 2009): >25% above best → +35 pts
  const bestCr = num(data, "best_creatinine");
  if (bestCr > 0 && cr > 0 && cr > bestCr * 1.25) pts += 35;

  // eGFR (mL/min/1.73m²)
  if (egfr < 15) pts += 30;
  else if (egfr < 30) pts += 25;
  else if (egfr < 45) pts += 12;

  // Proteinuria (g/day)
  if (prot > 3.0) pts += 20;
  else if (prot > 1.0) pts += 15;
  else if (prot > 0.3) pts += 8;

  // Potassium (mmol/L)
  if (k > 6.0) pts += 15;
  else if (k > 5.5 || (k > 0 && k < 3.5)) pts += 8;

  // Urea (mg/dL) — KDIGO 2024
  if (urea > 40) pts += 15;
  else if (urea > 20) pts += 5;

  // Phosphorus (mmol/L) — KDIGO CKD-MBD 2024
  if (phosphorus > 1.78) pts += 15;
  else if (phosphorus > 1.45) pts += 8;

  // Magnesium (mmol/L) — KDIGO CKD-MBD 2024
  if (magnesium > 0 && magnesium < 0.4) pts += 12;
  else if (magnesium > 0 && magnesium < 0.6) pts += 5;

  // Tacrolimus — KDIGO 2009/2024 time-dependent windows
  pts += kidneyTacrolimusScore(tac, daysSinceTx).pts;

  // BK Virus (copies/ml) — KDIGO 2009/2024
  if (bkVirus > 10000) pts += 20;
  else if (bkVirus > 1000) pts += 10;

  // CMV (copies/ml) — KDIGO 2009/2024
  if (cmv > 1000) pts += 15;
  else if (cmv > 500) pts += 8;

  // DSA MFI — Banff/KDIGO
  if (dsaMfi > 5000) pts += 20;
  else if (dsaMfi > 1000) pts += 10;

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

export { kidneyTacrolimusScore, liverTacrolimusScore };
