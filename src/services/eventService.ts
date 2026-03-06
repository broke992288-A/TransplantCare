import { supabase } from "@/integrations/supabase/client";
import type { PatientEvent } from "@/types/patient";

export async function fetchEventsByPatientId(patientId: string, limit?: number) {
  let query = supabase
    .from("patient_events")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PatientEvent[];
}

export async function insertEvent(event: {
  patient_id: string;
  event_type: string;
  description: string;
  created_by?: string;
}) {
  const { error } = await supabase.from("patient_events").insert(event);
  if (error) throw error;
}

export async function insertEvents(events: {
  patient_id: string;
  event_type: string;
  description: string;
  created_by?: string;
}[]) {
  const { error } = await supabase.from("patient_events").insert(events);
  if (error) throw error;
}
