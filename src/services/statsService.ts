import { supabase } from "@/integrations/supabase/client";

export async function fetchPatientStats() {
  const { data, error } = await supabase
    .from("patients")
    .select("id, organ_type, risk_level, region, transplant_date, created_at");
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllMedicationsAggregated() {
  const { data, error } = await supabase
    .from("medications")
    .select("id, medication_name, dosage, frequency, is_active, start_date, patient_id");
  if (error) throw error;
  return data ?? [];
}

export async function fetchTotalLabCount() {
  const { count, error } = await supabase
    .from("lab_results")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function fetchAllUnreadAlertCount() {
  const { count, error } = await supabase
    .from("patient_alerts")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}
