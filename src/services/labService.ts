import { supabase } from "@/integrations/supabase/client";
import type { LabResult } from "@/types/patient";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/** Minimal lab summary used by patient list views */
export interface LatestLabSummary {
  patient_id: string;
  tacrolimus_level: number | null;
  creatinine: number | null;
  alt: number | null;
  ast: number | null;
  total_bilirubin: number | null;
  egfr: number | null;
  potassium: number | null;
  recorded_at: string;
}

export async function fetchLatestLabsByPatientIds(
  patientIds: string[]
): Promise<Record<string, LatestLabSummary>> {
  if (patientIds.length === 0) return {};

  const { data, error } = await supabase
    .from("lab_results")
    .select("patient_id, tacrolimus_level, creatinine, alt, ast, total_bilirubin, egfr, potassium, recorded_at")
    .in("patient_id", patientIds)
    .order("recorded_at", { ascending: false });
  if (error) throw error;

  const labMap: Record<string, LatestLabSummary> = {};
  data?.forEach((l) => {
    if (!labMap[l.patient_id]) labMap[l.patient_id] = l as LatestLabSummary;
  });
  return labMap;
}

export async function fetchLabsByPatientId(patientId: string, limit?: number) {
  let query = supabase
    .from("lab_results")
    .select("*")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LabResult[];
}

export async function insertLabResult(labData: TablesInsert<"lab_results">) {
  const { data, error } = await supabase
    .from("lab_results")
    .insert([labData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Lab field keys that can be merged during upsert */
const LAB_NUMERIC_KEYS = [
  "hb", "tlc", "platelets", "pti", "inr",
  "total_bilirubin", "direct_bilirubin", "ast", "alt", "alp", "ggt",
  "total_protein", "albumin", "urea", "creatinine", "egfr",
  "sodium", "potassium", "calcium", "magnesium", "phosphorus",
  "uric_acid", "crp", "esr", "ldh", "ammonia",
  "tacrolimus_level", "cyclosporine", "proteinuria",
  "bk_virus_load", "cmv_load", "dsa_mfi",
] as const;

type LabNumericKey = typeof LAB_NUMERIC_KEYS[number];

/**
 * Check if a lab result already exists for the same patient and date.
 * If found, merge new values into existing record (fill nulls, don't overwrite existing).
 * If not found, insert a new record.
 */
export async function upsertLabResult(labData: TablesInsert<"lab_results">): Promise<LabResult> {
  const { patient_id, recorded_at } = labData;

  if (!recorded_at || !patient_id) {
    return insertLabResult(labData) as Promise<LabResult>;
  }

  const recordedDate = new Date(recorded_at);
  const startOfDay = new Date(recordedDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(recordedDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const { data: existing } = await supabase
    .from("lab_results")
    .select("*")
    .eq("patient_id", patient_id)
    .gte("recorded_at", startOfDay.toISOString())
    .lte("recorded_at", endOfDay.toISOString())
    .limit(1)
    .single();

  if (existing) {
    const updates: TablesUpdate<"lab_results"> = {};
    for (const key of LAB_NUMERIC_KEYS) {
      const newVal = labData[key as LabNumericKey];
      const existingVal = existing[key as LabNumericKey];
      if (existingVal == null && newVal != null) {
        (updates as Record<string, unknown>)[key] = newVal;
      }
    }

    if (!existing.report_file_url && labData.report_file_url) {
      updates.report_file_url = labData.report_file_url;
    }

    if (Object.keys(updates).length > 0) {
      const { data: updated, error } = await supabase
        .from("lab_results")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return updated as LabResult;
    }

    return existing as LabResult;
  }

  return insertLabResult(labData) as Promise<LabResult>;
}

/** Update a lab result's recorded_at date */
export async function updateLabDate(labId: string, newDate: string) {
  const { data, error } = await supabase
    .from("lab_results")
    .update({ recorded_at: new Date(newDate).toISOString() })
    .eq("id", labId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Update a lab result with partial data */
export async function updateLabResult(labId: string, updates: TablesUpdate<"lab_results">) {
  const { data, error } = await supabase
    .from("lab_results")
    .update(updates)
    .eq("id", labId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a lab result by ID */
export async function deleteLabResult(labId: string) {
  await supabase.from("risk_snapshots").delete().eq("lab_result_id", labId);
  const { error } = await supabase.from("lab_results").delete().eq("id", labId);
  if (error) throw error;
}
