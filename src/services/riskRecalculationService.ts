import { supabase } from "@/integrations/supabase/client";

export interface RecalculationResult {
  success: boolean;
  algorithm_version?: string;
  patients_processed?: number;
  snapshots_created?: number;
  alerts_generated?: number;
  has_more?: boolean;
  next_offset?: number | null;
  error?: string;
}

/**
 * Trigger historical risk recalculation for a single patient or a batch.
 * Uses supabase.functions.invoke() to avoid CORS issues on mobile.
 */
export async function triggerRiskRecalculation(
  patientId?: string,
  offset?: number,
  limit?: number
): Promise<RecalculationResult> {
  const body: Record<string, any> = {};
  if (patientId) body.patient_id = patientId;
  if (offset != null) body.offset = offset;
  if (limit != null) body.limit = limit;

  const { data, error } = await supabase.functions.invoke("recalculate-risk", {
    body,
  });

  if (error) {
    throw new Error(`Recalculation failed: ${error.message}`);
  }

  return data as RecalculationResult;
}

/**
 * Recalculate all patients in batches of 20.
 * Calls recalculate-risk repeatedly until all patients are processed.
 */
export async function triggerFullRecalculation(
  onProgress?: (processed: number, total: number) => void
): Promise<{ totalProcessed: number; totalSnapshots: number; totalAlerts: number }> {
  let offset = 0;
  const batchSize = 20;
  let totalProcessed = 0;
  let totalSnapshots = 0;
  let totalAlerts = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await triggerRiskRecalculation(undefined, offset, batchSize);
    totalProcessed += result.patients_processed ?? 0;
    totalSnapshots += result.snapshots_created ?? 0;
    totalAlerts += result.alerts_generated ?? 0;
    hasMore = result.has_more ?? false;
    offset = result.next_offset ?? offset + batchSize;

    onProgress?.(totalProcessed, totalProcessed + (hasMore ? batchSize : 0));
  }

  return { totalProcessed, totalSnapshots, totalAlerts };
}
