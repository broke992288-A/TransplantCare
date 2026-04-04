/**
 * Smart Priority Queue — computes urgency for each patient based on:
 * 1. Critical risk alerts (risk_level = 'high')
 * 2. Lab spike (any key value changed >30% from previous)
 * 3. Overdue labs (past scheduled date)
 * 4. Medication non-adherence (missed 2+ days)
 * 5. Stable (everything normal)
 */

import type { LatestLabSummary } from "@/services/labService";

export type UrgencyTier = "critical" | "warning" | "stable";

export interface SmartPriorityResult {
  tier: UrgencyTier;
  score: number; // 0-100 for sorting within tier
  reason: string; // one-line human-readable reason
  reasonKey: string; // i18n key
}

interface PatientInput {
  risk_level: string;
  risk_score: number | null;
  organ_type: string;
}

interface LabPair {
  latest: LatestLabSummary | null;
  previous: LatestLabSummary | null;
}

const LAB_KEYS: (keyof Pick<LatestLabSummary, "creatinine" | "alt" | "ast" | "total_bilirubin" | "tacrolimus_level" | "egfr" | "potassium">)[] = [
  "creatinine", "alt", "ast", "total_bilirubin", "tacrolimus_level", "potassium",
];

const LAB_LABELS: Record<string, string> = {
  creatinine: "Creatinine",
  alt: "ALT",
  ast: "AST",
  total_bilirubin: "Bilirubin",
  tacrolimus_level: "Tacrolimus",
  egfr: "eGFR",
  potassium: "Potassium",
};

function detectLabSpike(labPair: LabPair): { key: string; pct: number } | null {
  if (!labPair.latest || !labPair.previous) return null;
  let worstSpike: { key: string; pct: number } | null = null;

  for (const key of LAB_KEYS) {
    const curr = labPair.latest[key];
    const prev = labPair.previous[key];
    if (curr == null || prev == null || prev === 0) continue;

    // For eGFR, a drop is bad (inverted)
    const pctChange = key === "egfr"
      ? ((prev - curr) / prev) * 100
      : ((curr - prev) / Math.abs(prev)) * 100;

    if (pctChange > 30) {
      if (!worstSpike || pctChange > worstSpike.pct) {
        worstSpike = { key, pct: Math.round(pctChange) };
      }
    }
  }
  return worstSpike;
}

export function computeSmartPriority(
  patient: PatientInput,
  labPair: LabPair,
  hasOverdueLabs: boolean,
  missedMedDays: number,
): SmartPriorityResult {
  // 1. Critical risk
  if (patient.risk_level === "high") {
    const spike = detectLabSpike(labPair);
    const reason = spike
      ? `${LAB_LABELS[spike.key]} increased ${spike.pct}%`
      : `Risk level: HIGH (score ${patient.risk_score ?? "—"})`;
    return { tier: "critical", score: patient.risk_score ?? 80, reason, reasonKey: "critical_risk" };
  }

  // 2. Lab spike >30%
  const spike = detectLabSpike(labPair);
  if (spike) {
    return {
      tier: "warning",
      score: 70 + Math.min(spike.pct, 30),
      reason: `${LAB_LABELS[spike.key]} increased ${spike.pct}%`,
      reasonKey: "lab_spike",
    };
  }

  // 3. Overdue labs
  if (hasOverdueLabs) {
    return {
      tier: "warning",
      score: 60,
      reason: "Overdue lab tests",
      reasonKey: "overdue_labs",
    };
  }

  // 4. Medication non-adherence
  if (missedMedDays >= 2) {
    return {
      tier: "warning",
      score: 55 + missedMedDays,
      reason: `Missed medication ${missedMedDays} days`,
      reasonKey: "med_nonadherence",
    };
  }

  // 5. Medium risk
  if (patient.risk_level === "medium") {
    return {
      tier: "warning",
      score: 40,
      reason: "Medium risk",
      reasonKey: "medium_risk",
    };
  }

  // 6. Stable
  return {
    tier: "stable",
    score: patient.risk_score ?? 0,
    reason: "Stable",
    reasonKey: "stable",
  };
}

/** Sort tier order: critical=0, warning=1, stable=2 */
const TIER_ORDER: Record<UrgencyTier, number> = { critical: 0, warning: 1, stable: 2 };

export function comparePriority(a: SmartPriorityResult, b: SmartPriorityResult): number {
  const tierDiff = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
  if (tierDiff !== 0) return tierDiff;
  return b.score - a.score; // higher score first within same tier
}
