import { useMemo } from "react";
import { calculateRisk, calculateRiskScore } from "@/services/riskService";
import type { OrganType, RiskLevel } from "@/types/patient";

export function useCalculatedRisk(organ: OrganType, labData: Record<string, any>): RiskLevel {
  return useMemo(() => calculateRisk(organ, labData), [organ, labData]);
}

export function useCalculatedRiskScore(organ: OrganType, labData: Record<string, any>): number {
  return useMemo(() => calculateRiskScore(organ, labData), [organ, labData]);
}
