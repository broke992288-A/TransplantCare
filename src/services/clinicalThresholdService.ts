/**
 * Clinical Threshold Service
 * Reads thresholds from the clinical_thresholds database table.
 * Replaces hardcoded thresholds in riskSnapshotService.ts
 */

import { supabase } from "@/integrations/supabase/client";

export interface ClinicalThreshold {
  id: string;
  parameter: string;
  organ_type: string;
  warning_min: number | null;
  warning_max: number | null;
  critical_min: number | null;
  critical_max: number | null;
  unit: string;
  normal_min: number | null;
  normal_max: number | null;
  guideline_source: string;
  guideline_year: number;
  evidence_level: string | null;
  reference_url: string | null;
  trend_threshold_pct: number | null;
  trend_direction: string | null;
  risk_points_warning: number;
  risk_points_critical: number;
}

// In-memory cache for thresholds (refreshed every 5 minutes)
let cachedThresholds: ClinicalThreshold[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all clinical thresholds from the database.
 * Uses in-memory cache to avoid repeated queries.
 */
export async function fetchClinicalThresholds(): Promise<ClinicalThreshold[]> {
  const now = Date.now();
  if (cachedThresholds && now - cacheTimestamp < CACHE_TTL) {
    return cachedThresholds;
  }

  const { data, error } = await supabase
    .from("clinical_thresholds" as any)
    .select("*");

  if (error) {
    console.error("Failed to fetch clinical thresholds:", error);
    // Return cached data if available, otherwise empty
    return cachedThresholds ?? [];
  }

  cachedThresholds = (data ?? []) as unknown as ClinicalThreshold[];
  cacheTimestamp = now;
  return cachedThresholds;
}

/**
 * Get thresholds for a specific organ type.
 */
export async function getThresholdsForOrgan(organType: string): Promise<ClinicalThreshold[]> {
  const all = await fetchClinicalThresholds();
  return all.filter((t) => t.organ_type === organType);
}

/**
 * Get a specific threshold by parameter and organ type.
 */
export async function getThreshold(parameter: string, organType: string): Promise<ClinicalThreshold | null> {
  const all = await fetchClinicalThresholds();
  return all.find((t) => t.parameter === parameter && t.organ_type === organType) ?? null;
}

/**
 * Evaluate a lab value against its threshold.
 * Returns the status and relevant threshold info.
 */
export function evaluateValue(
  value: number | null | undefined,
  threshold: ClinicalThreshold
): {
  status: "normal" | "warning" | "critical";
  message: string;
  guideline: string;
  points: number;
} {
  if (value == null) return { status: "normal", message: "", guideline: "", points: 0 };

  const guideline = `${threshold.guideline_source} ${threshold.guideline_year}`;

  // Check critical first (more severe)
  if (threshold.critical_min != null && value >= threshold.critical_min) {
    return {
      status: "critical",
      message: `${threshold.parameter} ${value} ${threshold.unit} ≥ ${threshold.critical_min} (critical)`,
      guideline,
      points: threshold.risk_points_critical,
    };
  }
  if (threshold.critical_max != null && value <= threshold.critical_max) {
    return {
      status: "critical",
      message: `${threshold.parameter} ${value} ${threshold.unit} ≤ ${threshold.critical_max} (critical)`,
      guideline,
      points: threshold.risk_points_critical,
    };
  }

  // Check warning
  if (threshold.warning_min != null && value >= threshold.warning_min) {
    return {
      status: "warning",
      message: `${threshold.parameter} ${value} ${threshold.unit} ≥ ${threshold.warning_min} (warning)`,
      guideline,
      points: threshold.risk_points_warning,
    };
  }
  if (threshold.warning_max != null && value <= threshold.warning_max) {
    return {
      status: "warning",
      message: `${threshold.parameter} ${value} ${threshold.unit} ≤ ${threshold.warning_max} (warning)`,
      guideline,
      points: threshold.risk_points_warning,
    };
  }

  return { status: "normal", message: "", guideline, points: 0 };
}

/**
 * Invalidate the threshold cache (call after admin updates thresholds).
 */
export function invalidateThresholdCache(): void {
  cachedThresholds = null;
  cacheTimestamp = 0;
}
