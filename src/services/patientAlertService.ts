import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export type AlertStatus = "new" | "acknowledged" | "reviewed" | "resolved" | "dismissed";

export interface PatientAlert {
  id: string;
  patient_id: string;
  risk_snapshot_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  status: AlertStatus;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
}

export async function insertPatientAlert(data: TablesInsert<"patient_alerts">) {
  const { error } = await supabase.from("patient_alerts").insert(data);
  if (error) throw error;
}

export async function fetchPatientAlerts(
  patientId: string,
  limit = 20,
  options: { includeClosed?: boolean } = {},
) {
  let query = supabase
    .from("patient_alerts")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!options.includeClosed) {
    query = query.not("status", "in", "(resolved,dismissed)");
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PatientAlert[];
}

export async function fetchUnreadAlertCount(patientId: string) {
  const { count, error } = await supabase
    .from("patient_alerts")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("status", "new");
  if (error) throw error;
  return count ?? 0;
}

export async function acknowledgeAlert(alertId: string) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  const { error } = await supabase
    .from("patient_alerts")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: uid,
      is_read: true,
    })
    .eq("id", alertId);
  if (error) throw error;
}

export async function resolveAlert(alertId: string, note?: string) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  const { error } = await supabase
    .from("patient_alerts")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: uid,
      resolution_note: note ?? null,
      is_read: true,
    })
    .eq("id", alertId);
  if (error) throw error;
}

export async function markAlertRead(alertId: string) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  const { error } = await supabase
    .from("patient_alerts")
    .update({
      is_read: true,
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: uid,
    })
    .eq("id", alertId)
    .eq("status", "new");
  if (error) throw error;
}

export async function markAllAlertsRead(patientId?: string) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  let query = supabase
    .from("patient_alerts")
    .update({
      is_read: true,
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: uid,
    })
    .eq("status", "new");
  if (patientId) {
    query = query.eq("patient_id", patientId);
  }
  const { error } = await query;
  if (error) throw error;
}
