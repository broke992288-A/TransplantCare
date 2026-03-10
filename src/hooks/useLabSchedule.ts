import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLabSchedules, fetchAllOverdueSchedules } from "@/services/labScheduleService";

export function useLabSchedules(patientId: string | undefined) {
  return useQuery({
    queryKey: ["lab-schedules", patientId],
    queryFn: () => fetchLabSchedules(patientId!),
    enabled: !!patientId,
  });
}

export function useOverdueLabSchedules() {
  return useQuery({
    queryKey: ["overdue-lab-schedules"],
    queryFn: fetchAllOverdueSchedules,
    refetchInterval: 60000, // refresh every minute
  });
}

export function useInvalidateLabSchedules() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["lab-schedules"] });
    qc.invalidateQueries({ queryKey: ["overdue-lab-schedules"] });
  };
}
