import { supabase } from "@/integrations/supabase/client";
import type { LabResult } from "@/types/patient";

export async function fetchLatestLabsByPatientIds(patientIds: string[]) {
  if (patientIds.length === 0) return {};
  const { data, error } = await supabase
    .from("lab_results")
    .select("patient_id, tacrolimus_level, creatinine")
    .in("patient_id", patientIds)
    .order("recorded_at", { ascending: false });
  if (error) throw error;
  const labMap: Record<string, { patient_id: string; tacrolimus_level: number | null; creatinine: number | null }> = {};
  data?.forEach((l) => {
    if (!labMap[l.patient_id]) labMap[l.patient_id] = l;
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

export async function insertLabResult(labData: Record<string, any>) {
  const { data, error } = await supabase
    .from("lab_results")
    .insert([labData as any])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check if a lab result already exists for the same patient and date.
 * If found, merge new values into existing record (fill nulls, don't overwrite existing).
 * If not found, insert a new record.
 */
export async function upsertLabResult(labData: Record<string, any>): Promise<any> {
  const { patient_id, recorded_at } = labData;

  if (!recorded_at || !patient_id) {
    return insertLabResult(labData);
  }

  // Normalize to date-only for comparison
  const recordedDate = new Date(recorded_at);
  const startOfDay = new Date(recordedDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(recordedDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Check for existing record on same date
  const { data: existing } = await supabase
    .from("lab_results")
    .select("*")
    .eq("patient_id", patient_id)
    .gte("recorded_at", startOfDay.toISOString())
    .lte("recorded_at", endOfDay.toISOString())
    .limit(1)
    .single();

  if (existing) {
    // Merge: fill null fields from new data, keep existing non-null values
    const updates: Record<string, any> = {};
    const LAB_KEYS = [
      "hb", "tlc", "platelets", "pti", "inr",
      "total_bilirubin", "direct_bilirubin", "ast", "alt", "alp", "ggt",
      "total_protein", "albumin", "urea", "creatinine", "egfr",
      "sodium", "potassium", "calcium", "magnesium", "phosphorus",
      "uric_acid", "crp", "esr", "ldh", "ammonia",
      "tacrolimus_level", "cyclosporine", "proteinuria",
    ];

    for (const key of LAB_KEYS) {
      const newVal = labData[key];
      const existingVal = (existing as any)[key];
      // Fill null existing with new non-null value
      if (existingVal == null && newVal != null) {
        updates[key] = newVal;
      }
    }

    // Update report_file_url if existing doesn't have one
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
      return updated;
    }

    return existing;
  }

// No existing record — insert new
  return insertLabResult(labData);
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

/** Delete a lab result by ID */
export async function deleteLabResult(labId: string) {
  // First delete related risk_snapshots
  await supabase.from("risk_snapshots").delete().eq("lab_result_id", labId);
  const { error } = await supabase.from("lab_results").delete().eq("id", labId);
  if (error) throw error;
}
