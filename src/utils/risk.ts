import type { OrganType, RiskLevel } from "@/types/patient";

export function calculateRisk(organ: OrganType, data: Record<string, any>): RiskLevel {
  // Blood type incompatibility with no titer therapy → elevated risk
  const bloodMismatch = data.blood_type && data.donor_blood_type && data.blood_type !== data.donor_blood_type;
  const titerDone = data.titer_therapy === "yes" || data.titer_therapy === true;
  const incompatibleNoTiter = bloodMismatch && !titerDone;

  if (organ === "liver") {
    const alt = parseFloat(data.alt) || 0;
    const tac = parseFloat(data.tacrolimus_level) || 0;
    const txNum = parseInt(data.transplant_number) || 1;
    if (incompatibleNoTiter) return "high";
    if (alt > 120) return "high";
    if (tac < 5) return txNum >= 2 ? "high" : "medium";
    if (bloodMismatch && titerDone) return txNum >= 2 ? "high" : "medium";
    if (txNum >= 2) return "medium";
    return "low";
  } else {
    const cr = parseFloat(data.creatinine) || 0;
    const egfr = parseFloat(data.egfr) || 999;
    const dialysis = data.dialysis_history === "yes" || data.dialysis_history === true;
    if (incompatibleNoTiter) return "high";
    if (dialysis) return "high";
    if (cr > 2.5) return "high";
    if (egfr < 30) return "high";
    if (bloodMismatch && titerDone) return cr > 1.5 || egfr < 45 ? "high" : "medium";
    if (egfr < 45) return "medium";
    if (cr > 1.5) return "medium";
    return "low";
  }
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
