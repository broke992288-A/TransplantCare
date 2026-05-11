import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AlertGroupLab {
  recorded_at: string;
  creatinine: number | null;
  egfr: number | null;
  alt: number | null;
  ast: number | null;
  total_bilirubin: number | null;
  tacrolimus_level: number | null;
  ggt: number | null;
  alp: number | null;
}

export interface PatientAlertGroup {
  patient_id: string;
  patient_name: string;
  organ_type: "kidney" | "liver";
  transplant_date: string | null;
  alerts: Array<{
    id: string;
    severity: string;
    alert_type: string;
    title: string;
    message: string | null;
    created_at: string;
    is_read: boolean;
  }>;
  unreadCount: number;
  highestSeverity: "critical" | "warning" | "info";
  lastLabAt: string | null;
  daysSinceLastLab: number | null;
  labs: AlertGroupLab[];
}

interface AlertRow {
  id: string;
  patient_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  patients: {
    full_name: string;
    organ_type: string;
    transplant_date: string | null;
  } | null;
}

interface LabRow extends AlertGroupLab {
  patient_id: string;
}

const SEVERITY_RANK = { critical: 3, warning: 2, info: 1 } as const;

async function fetchGroupedAlerts(): Promise<PatientAlertGroup[]> {
  const { data: alertsData, error: alertsErr } = await supabase
    .from("patient_alerts")
    .select(
      "id,patient_id,alert_type,severity,title,message,is_read,created_at,patients!patient_alerts_patient_id_fkey(full_name,organ_type,transplant_date)",
    )
    .order("created_at", { ascending: false })
    .limit(150);
  if (alertsErr) throw alertsErr;

  const rows = (alertsData ?? []) as unknown as AlertRow[];
  const patientIds = Array.from(new Set(rows.map((r) => r.patient_id)));
  if (patientIds.length === 0) return [];

  // Bulk fetch last labs (limited overall) for sparklines & last-lab timing.
  const { data: labsData, error: labsErr } = await supabase
    .from("lab_results")
    .select(
      "patient_id,recorded_at,creatinine,egfr,alt,ast,total_bilirubin,tacrolimus_level,ggt,alp",
    )
    .in("patient_id", patientIds)
    .order("recorded_at", { ascending: false })
    .limit(patientIds.length * 5);
  if (labsErr) throw labsErr;

  const labsByPatient = new Map<string, AlertGroupLab[]>();
  for (const row of (labsData ?? []) as LabRow[]) {
    const list = labsByPatient.get(row.patient_id) ?? [];
    if (list.length < 5) {
      list.push({
        recorded_at: row.recorded_at,
        creatinine: row.creatinine,
        egfr: row.egfr,
        alt: row.alt,
        ast: row.ast,
        total_bilirubin: row.total_bilirubin,
        tacrolimus_level: row.tacrolimus_level,
        ggt: row.ggt,
        alp: row.alp,
      });
      labsByPatient.set(row.patient_id, list);
    }
  }

  const groups = new Map<string, PatientAlertGroup>();
  for (const r of rows) {
    const existing = groups.get(r.patient_id);
    const sev = (["critical", "warning", "info"].includes(r.severity)
      ? r.severity
      : "info") as "critical" | "warning" | "info";
    if (!existing) {
      const labs = (labsByPatient.get(r.patient_id) ?? []).slice().reverse(); // chronological
      const lastLabAt = labs.length ? labs[labs.length - 1].recorded_at : null;
      const daysSinceLastLab = lastLabAt
        ? Math.max(0, Math.floor((Date.now() - new Date(lastLabAt).getTime()) / 86_400_000))
        : null;
      groups.set(r.patient_id, {
        patient_id: r.patient_id,
        patient_name: r.patients?.full_name ?? "—",
        organ_type: (r.patients?.organ_type as "kidney" | "liver") ?? "kidney",
        transplant_date: r.patients?.transplant_date ?? null,
        alerts: [
          {
            id: r.id,
            severity: r.severity,
            alert_type: r.alert_type,
            title: r.title,
            message: r.message,
            created_at: r.created_at,
            is_read: r.is_read,
          },
        ],
        unreadCount: r.is_read ? 0 : 1,
        highestSeverity: sev,
        lastLabAt,
        daysSinceLastLab,
        labs,
      });
    } else {
      existing.alerts.push({
        id: r.id,
        severity: r.severity,
        alert_type: r.alert_type,
        title: r.title,
        message: r.message,
        created_at: r.created_at,
        is_read: r.is_read,
      });
      if (!r.is_read) existing.unreadCount += 1;
      if (SEVERITY_RANK[sev] > SEVERITY_RANK[existing.highestSeverity]) {
        existing.highestSeverity = sev;
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const sevDiff = SEVERITY_RANK[b.highestSeverity] - SEVERITY_RANK[a.highestSeverity];
    if (sevDiff !== 0) return sevDiff;
    return b.alerts[0].created_at.localeCompare(a.alerts[0].created_at);
  });
}

export function useGroupedAlerts() {
  return useQuery({
    queryKey: ["grouped-alerts"],
    queryFn: fetchGroupedAlerts,
  });
}
