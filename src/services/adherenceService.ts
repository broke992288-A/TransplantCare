import { supabase } from "@/integrations/supabase/client";

export interface MedicationAdherence {
  id: string;
  patient_id: string;
  medication_id: string;
  scheduled_date: string;
  taken: boolean;
  taken_at: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * Fetch adherence records for a patient within a date range.
 */
export async function fetchAdherenceRecords(
  patientId: string,
  fromDate?: string,
  toDate?: string
): Promise<MedicationAdherence[]> {
  let query = supabase
    .from("medication_adherence" as any)
    .select("*")
    .eq("patient_id", patientId)
    .order("scheduled_date", { ascending: false });

  if (fromDate) query = query.gte("scheduled_date", fromDate);
  if (toDate) query = query.lte("scheduled_date", toDate);

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as MedicationAdherence[];
}

/**
 * Record medication taken or missed.
 */
export async function recordAdherence(record: {
  patient_id: string;
  medication_id: string;
  scheduled_date: string;
  taken: boolean;
  notes?: string;
}): Promise<MedicationAdherence> {
  const payload = {
    ...record,
    taken_at: record.taken ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("medication_adherence" as any)
    .upsert(payload as any, { onConflict: "medication_id,scheduled_date" })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as MedicationAdherence;
}

/**
 * Get adherence rate for a patient over the last N days.
 */
export async function getAdherenceRate(
  patientId: string,
  days: number = 30
): Promise<{ total: number; taken: number; rate: number }> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const records = await fetchAdherenceRecords(
    patientId,
    fromDate.toISOString().split("T")[0]
  );

  const total = records.length;
  const taken = records.filter((r) => r.taken).length;
  return {
    total,
    taken,
    rate: total > 0 ? Math.round((taken / total) * 100) : 100,
  };
}
