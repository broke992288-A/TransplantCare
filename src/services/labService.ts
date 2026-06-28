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

  // Single batch query bounded to current dashboard needs (latest per patient).
  const { data, error } = await supabase
    .from("lab_results")
    .select("patient_id, tacrolimus_level, creatinine, alt, ast, total_bilirubin, egfr, potassium, recorded_at")
    .in("patient_id", patientIds)
    .order("recorded_at", { ascending: false })
    .limit(Math.max(10, patientIds.length * 2));
  if (error) throw error;

  // Map-based grouping (O(n)) — first occurrence per patient is latest by DESC order.
  const seen = new Map<string, LatestLabSummary>();
  (data ?? []).forEach((l) => {
    if (!seen.has(l.patient_id)) seen.set(l.patient_id, l as LatestLabSummary);
  });
  const labMap: Record<string, LatestLabSummary> = {};
  seen.forEach((v, k) => { labMap[k] = v; });
  return labMap;
}

export async function fetchLabsByPatientId(patientId: string, limit?: number) {
  let query = supabase
    .from("lab_results")
    .select("*")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
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
  "uric_acid", "crp", "esr", "ldh", "ammonia", "glucose",
  "tacrolimus_level", "cyclosporine", "proteinuria",
  "bk_virus_load", "cmv_load", "dsa_mfi",
] as const;

type LabNumericKey = typeof LAB_NUMERIC_KEYS[number];

/** Default clinical timezone for day bucketing (Afzal pilot — IST). */
const CLINICAL_TZ = "Asia/Kolkata";

/**
 * Returns the YYYY-MM-DD calendar day of an ISO timestamp **in the given IANA
 * timezone**, not UTC. Lab uploaded at 01:00 IST must bucket to today's IST
 * date, not yesterday's UTC date.
 */
function getLocalDayKey(iso: string, tz: string = CLINICAL_TZ): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Stable content hash over the clinical numeric payload for dedupe. */
function computeContentHash(labData: TablesInsert<"lab_results">): string {
  const payload: Record<string, unknown> = {};
  for (const key of LAB_NUMERIC_KEYS) {
    const v = labData[key as LabNumericKey];
    if (v != null) payload[key] = v;
  }
  const sorted = Object.keys(payload).sort().reduce<Record<string, unknown>>((acc, k) => {
    acc[k] = payload[k];
    return acc;
  }, {});
  return JSON.stringify(sorted);
}

/**
 * Check if a lab result already exists for the same patient and date.
 * If found, merge new values into existing record (fill nulls, don't overwrite existing).
 * If not found, insert a new record.
 *
 * Day bucketing uses the clinical timezone (default IST) — never raw UTC
 * midnight — so labs taken late at night don't bleed into the previous day.
 */
export async function upsertLabResult(labData: TablesInsert<"lab_results">): Promise<LabResult> {
  const { patient_id, recorded_at } = labData;

  if (!patient_id) {
    return insertLabResult(labData) as Promise<LabResult>;
  }

  const effectiveRecordedAt = recorded_at ?? new Date().toISOString();
  const targetDayKey = getLocalDayKey(effectiveRecordedAt);

  // Pull a UTC window that safely brackets the target IST day (±36h superset).
  const anchor = new Date(effectiveRecordedAt);
  const windowStart = new Date(anchor.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(anchor.getTime() + 36 * 60 * 60 * 1000).toISOString();

  const { data: candidates } = await supabase
    .from("lab_results")
    .select("*")
    .eq("patient_id", patient_id)
    .is("deleted_at", null)
    .gte("recorded_at", windowStart)
    .lte("recorded_at", windowEnd);

  const existing = (candidates ?? []).find(
    (row) => row.recorded_at && getLocalDayKey(row.recorded_at) === targetDayKey
  );

  if (existing) {
    // Content-hash dedupe: identical clinical payload on same day → skip.
    const incomingHash = computeContentHash(labData);
    const existingHash = computeContentHash(existing as TablesInsert<"lab_results">);
    if (incomingHash === existingHash && incomingHash !== "{}") {
      try {
        await supabase.rpc("log_audit_event", {
          _action: "duplicate_lab_skipped",
          _entity_type: "lab_result",
          _entity_id: existing.id,
          _metadata: {
            patient_id,
            recorded_at: effectiveRecordedAt,
            day_key: targetDayKey,
            timezone: CLINICAL_TZ,
            content_hash: incomingHash,
          } as never,
        });
      } catch (err) {
        console.error("[upsertLabResult] duplicate audit log failed", err);
      }
      return existing as LabResult;
    }

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

  return insertLabResult({ ...labData, recorded_at: effectiveRecordedAt }) as Promise<LabResult>;
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

/**
 * Soft-delete a lab result. Clinical history must remain recoverable, so we
 * never hard-delete. The reason is required and the event is recorded in the
 * immutable audit log. Associated risk_snapshots are intentionally retained
 * for historical traceability.
 */
export async function deleteLabResult(labId: string, reason: string) {
  const trimmed = (reason ?? "").trim();
  if (trimmed.length < 3) {
    throw new Error("A deletion reason (min 3 chars) is required");
  }
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;

  const { data: lab, error: updErr } = await supabase
    .from("lab_results")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: uid,
      delete_reason: trimmed,
    })
    .eq("id", labId)
    .is("deleted_at", null)
    .select("id, patient_id")
    .single();
  if (updErr) throw updErr;

  try {
    await supabase.rpc("log_audit_event", {
      _action: "lab_result_delete",
      _entity_type: "lab_result",
      _entity_id: labId,
      _metadata: { patient_id: lab?.patient_id, reason: trimmed } as never,
    });
  } catch (err) {
    console.error("[deleteLabResult] audit log failed", err);
  }
}

