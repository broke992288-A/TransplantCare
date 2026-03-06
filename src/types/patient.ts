import type { Tables } from "@/integrations/supabase/types";

export type Patient = Tables<"patients">;
export type LabResult = Tables<"lab_results">;
export type PatientEvent = Tables<"patient_events">;

export type PatientRow = Pick<Patient, "id" | "full_name" | "organ_type" | "risk_level" | "created_at">;

export type PatientListRow = Pick<Patient,
  "id" | "full_name" | "organ_type" | "risk_level" | "gender" |
  "date_of_birth" | "transplant_date" | "created_at" | "dialysis_history" | "return_dialysis_date"
>;

export type LatestLabRow = Pick<LabResult, "patient_id" | "tacrolimus_level" | "creatinine">;

export type OrganType = "liver" | "kidney";
export type RiskLevel = "low" | "medium" | "high";
