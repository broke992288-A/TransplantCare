/**
 * Provenance persistence for OCR-extracted lab values.
 *
 * One row per (lab_result_id, field_key). Records original OCR text, detected
 * unit, unit source, conversion applied, extraction source, confidence, and
 * doctor verification status.
 */

import { supabase } from "@/integrations/supabase/client";
import type { UnitSource } from "./unitDetection";
import type { OCRSource } from "./types";

export interface ProvenanceRow {
  lab_result_id: string;
  patient_id: string;
  field_key: string;
  original_text: string | null;
  raw_value: number | null;
  normalized_value: number | null;
  detected_unit: string | null;
  unit_source: UnitSource;
  confidence: number | null;
  extraction_source: OCRSource | "manual";
  conversion_applied: { from: string; to: string; factor: number } | null;
  verification_status?: "unverified" | "verified" | "corrected";
}

/**
 * Insert provenance rows for a single lab_result. Never throws — provenance is
 * best-effort observability and must not block the clinical save.
 */
export async function insertProvenanceRows(rows: ProvenanceRow[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    const { error } = await supabase
      .from("lab_value_provenance")
      // Cast: types regenerate after migration; until then keep flexible.
      .insert(rows as never);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[provenance] insert failed", error.message);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[provenance] insert threw", e);
  }
}

/** Mark a provenance row verified by the current doctor. */
export async function markProvenanceVerified(
  labResultId: string,
  fieldKey: string,
): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    await supabase
      .from("lab_value_provenance")
      .update({
        verification_status: "verified",
        verified_by: uid,
        verified_at: new Date().toISOString(),
      } as never)
      .eq("lab_result_id", labResultId)
      .eq("field_key", fieldKey);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[provenance] verify failed", e);
  }
}
