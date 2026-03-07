import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AlertWithPatient {
  id: string;
  patient_id: string;
  risk_snapshot_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  patient_name: string | null;
  organ_type: string | null;
}

async function fetchAllAlerts(): Promise<AlertWithPatient[]> {
  const { data, error } = await supabase
    .from("patient_alerts")
    .select("*, patients!patient_alerts_patient_id_fkey(full_name, organ_type)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    patient_id: row.patient_id,
    risk_snapshot_id: row.risk_snapshot_id,
    alert_type: row.alert_type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    is_read: row.is_read,
    created_at: row.created_at,
    patient_name: row.patients?.full_name ?? null,
    organ_type: row.patients?.organ_type ?? null,
  }));
}

export function useAlerts() {
  return useQuery({
    queryKey: ["all-alerts"],
    queryFn: fetchAllAlerts,
  });
}
