import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPatientAlerts, fetchUnreadAlertCount } from "@/services/patientAlertService";

export function usePatientAlerts(
  patientId: string | undefined,
  limit = 20,
  includeClosed = false,
) {
  return useQuery({
    queryKey: ["patient-alerts", patientId, limit, includeClosed],
    queryFn: () => fetchPatientAlerts(patientId!, limit, { includeClosed }),
    enabled: !!patientId,
  });
}

export function useUnreadAlertCount(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-alerts-unread", patientId],
    queryFn: () => fetchUnreadAlertCount(patientId!),
    enabled: !!patientId,
  });
}

export function useInvalidatePatientAlerts() {
  const qc = useQueryClient();
  return (patientId: string) => {
    qc.invalidateQueries({ queryKey: ["patient-alerts", patientId] });
    qc.invalidateQueries({ queryKey: ["patient-alerts-unread", patientId] });
  };
}
