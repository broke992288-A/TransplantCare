import type { OrganType, RiskLevel } from "@/types/patient";

export function calculateRisk(organ: OrganType, data: Record<string, any>): RiskLevel {
  if (organ === "liver") {
    const alt = parseFloat(data.alt) || 0;
    const tac = parseFloat(data.tacrolimus_level) || 0;
    const txNum = parseInt(data.transplant_number) || 1;
    if (alt > 120) return "high";
    if (tac < 5) return txNum >= 2 ? "high" : "medium";
    if (txNum >= 2) return "medium";
    return "low";
  } else {
    const cr = parseFloat(data.creatinine) || 0;
    const egfr = parseFloat(data.egfr) || 999;
    const dialysis = data.dialysis_history === "yes";
    if (dialysis) return "high";
    if (cr > 2.5) return "high";
    if (egfr < 30) return "high";
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
