import { supabase } from "@/integrations/supabase/client";

/**
 * SINGLE RISK ENGINE POLICY
 * Risk is computed ONLY on the server by public.calculate_risk_score_sql (v5.x).
 * There is intentionally no client-side scoring engine in this codebase.
 * UI-saved labs get their snapshot via record_lab_risk_snapshot, which also
 * decides verified_by_clinician from the caller's role.
 */

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
  verified_by_clinician?: boolean;
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



export interface RecordedRisk {
  score: number;
  level: "low" | "medium" | "high";
  flags: string[];
  algorithm_version: string | null;
  snapshot_id: string;
  verified_by_clinician: boolean;
}

function toFlags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => {
      if (typeof f === "string") return f;
      if (f && typeof f === "object") {
        const o = f as Record<string, unknown>;
        return typeof o.message === "string" ? o.message : typeof o.marker === "string" ? o.marker : null;
      }
      return null;
    })
    .filter((f): f is string => f !== null);
}

/** Server computes the score (calculate_risk_score_sql) and writes the snapshot. */
export async function recordLabRiskSnapshot(labResultId: string): Promise<RecordedRisk> {
  const { data, error } = await supabase.rpc("record_lab_risk_snapshot", { _lab_result_id: labResultId });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  const lvl = r.level;
  const flags = [...toFlags(r.flags), ...toFlags(r.critical_triggers)];
  return {
    score: Number(r.score ?? 0),
    level: lvl === "high" || lvl === "medium" ? lvl : "low",
    flags,
    algorithm_version: typeof r.algorithm_version === "string" ? r.algorithm_version : null,
    snapshot_id: String(r.snapshot_id ?? ""),
    verified_by_clinician: r.verified_by_clinician === true,
  };
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
    verified_by_clinician: row.verified_by_clinician,
  }));
}
