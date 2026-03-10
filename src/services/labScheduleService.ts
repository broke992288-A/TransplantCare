import { supabase } from "@/integrations/supabase/client";

export interface LabSchedule {
  id: string;
  patient_id: string;
  scheduled_date: string;
  status: "upcoming" | "due_soon" | "overdue" | "completed";
  completed_lab_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchLabSchedules(patientId: string): Promise<LabSchedule[]> {
  const { data, error } = await supabase
    .from("lab_schedules")
    .select("*")
    .eq("patient_id", patientId)
    .order("scheduled_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as LabSchedule[];
}

export async function fetchAllOverdueSchedules(): Promise<(LabSchedule & { patient_name: string; organ_type: string; last_lab_date: string | null })[]> {
  const today = new Date().toISOString().split("T")[0];
  
  // Fetch overdue and due_soon schedules
  const { data: schedules, error } = await supabase
    .from("lab_schedules")
    .select("*")
    .in("status", ["overdue", "due_soon", "upcoming"])
    .lte("scheduled_date", new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0])
    .is("completed_lab_id", null)
    .order("scheduled_date", { ascending: true });
  if (error) throw error;
  if (!schedules || schedules.length === 0) return [];

  // Get patient details
  const patientIds = [...new Set(schedules.map((s: any) => s.patient_id))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, organ_type")
    .in("id", patientIds);

  // Get latest lab dates
  const { data: labs } = await supabase
    .from("lab_results")
    .select("patient_id, recorded_at")
    .in("patient_id", patientIds)
    .order("recorded_at", { ascending: false });

  const patientMap = new Map((patients ?? []).map((p) => [p.id, p]));
  const lastLabMap = new Map<string, string>();
  (labs ?? []).forEach((l) => {
    if (!lastLabMap.has(l.patient_id)) lastLabMap.set(l.patient_id, l.recorded_at);
  });

  // Compute actual status based on date
  return schedules.map((s: any) => {
    const patient = patientMap.get(s.patient_id);
    const diffDays = Math.floor((new Date(s.scheduled_date).getTime() - Date.now()) / 86400000);
    let computedStatus = s.status;
    if (diffDays < 0) computedStatus = "overdue";
    else if (diffDays <= 3) computedStatus = "due_soon";

    return {
      ...s,
      status: computedStatus,
      patient_name: patient?.full_name ?? "Unknown",
      organ_type: patient?.organ_type ?? "kidney",
      last_lab_date: lastLabMap.get(s.patient_id) ?? null,
    };
  }) as any[];
}

export async function updateScheduleStatus(scheduleId: string, status: string, completedLabId?: string) {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (completedLabId) updates.completed_lab_id = completedLabId;
  const { error } = await supabase
    .from("lab_schedules")
    .update(updates)
    .eq("id", scheduleId);
  if (error) throw error;
}

export async function generateScheduleForPatient(patientId: string, transplantDate: string) {
  const { error } = await supabase.rpc("generate_lab_schedule", {
    _patient_id: patientId,
    _transplant_date: transplantDate,
  });
  if (error) throw error;
}

/** Auto-complete schedules when lab results match a scheduled date */
export async function autoCompleteSchedules(patientId: string, labId: string, labDate: string) {
  const labDateOnly = new Date(labDate).toISOString().split("T")[0];
  // Find schedules within ±3 days of the lab date
  const startDate = new Date(new Date(labDate).getTime() - 3 * 86400000).toISOString().split("T")[0];
  const endDate = new Date(new Date(labDate).getTime() + 3 * 86400000).toISOString().split("T")[0];

  const { data: schedules } = await supabase
    .from("lab_schedules")
    .select("id")
    .eq("patient_id", patientId)
    .is("completed_lab_id", null)
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate)
    .limit(1);

  if (schedules && schedules.length > 0) {
    await updateScheduleStatus(schedules[0].id, "completed", labId);
  }
}
