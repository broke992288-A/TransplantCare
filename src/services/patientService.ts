import { supabase } from "@/integrations/supabase/client";
import type { Patient, PatientListRow, OrganType, RiskLevel } from "@/types/patient";

export async function fetchDoctorPatients(doctorId: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, organ_type, risk_level, created_at")
    .eq("assigned_doctor_id", doctorId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllPatients() {
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, organ_type, risk_level, gender, date_of_birth, transplant_date, created_at, dialysis_history, return_dialysis_date");
  if (error) throw error;
  return (data ?? []) as PatientListRow[];
}

export async function fetchPatientById(id: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Patient;
}

export async function fetchLinkedPatient(userId: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("linked_user_id", userId)
    .limit(1);
  if (error) throw error;
  return (data?.[0] ?? null) as Patient | null;
}

export async function updatePatient(id: string, updates: Partial<Patient>) {
  const { error } = await supabase.from("patients").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deletePatient(id: string) {
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw error;
}

export async function insertPatient(patient: {
  full_name: string;
  date_of_birth?: string | null;
  gender?: string;
  organ_type: OrganType;
  risk_level: RiskLevel;
  assigned_doctor_id: string;
  transplant_number?: number;
  transplant_date?: string | null;
  rejection_type?: string | null;
  dialysis_history?: boolean;
  return_dialysis_date?: string | null;
  biopsy_result?: string | null;
  region?: string | null;
  district?: string | null;
}) {
  const { data, error } = await supabase
    .from("patients")
    .insert(patient)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
