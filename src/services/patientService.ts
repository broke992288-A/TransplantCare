import { supabase } from "@/integrations/supabase/client";
import type { Patient, PatientListRow, OrganType, RiskLevel } from "@/types/patient";

// --- Pagination types ---
export interface PaginatedResult<T> {
  data: T[];
  count: number;
}

export interface PatientFilters {
  search?: string;
  organType?: string;
  riskLevel?: string;
}

// --- Server-side paginated patient list ---
export async function fetchPaginatedPatients(
  page: number,
  pageSize: number,
  filters?: PatientFilters
): Promise<PaginatedResult<PatientListRow>> {
  let query = supabase
    .from("patients")
    .select(
      "id, full_name, organ_type, risk_level, gender, date_of_birth, transplant_date, created_at, dialysis_history, return_dialysis_date",
      { count: "exact" }
    );

  if (filters?.search) {
    query = query.ilike("full_name", `%${filters.search}%`);
  }
  if (filters?.organType && filters.organType !== "all") {
    query = query.eq("organ_type", filters.organType);
  }
  if (filters?.riskLevel && filters.riskLevel !== "all") {
    query = query.eq("risk_level", filters.riskLevel);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as PatientListRow[], count: count ?? 0 };
}

export async function fetchDoctorPatients(doctorId: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, organ_type, risk_level, risk_score, last_risk_evaluation, created_at, transplant_date")
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
  blood_type?: string | null;
  donor_blood_type?: string | null;
  titer_therapy?: boolean;
  phone?: string | null;
}) {
  const { data, error } = await supabase
    .from("patients")
    .insert(patient)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
