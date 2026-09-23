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
    // Overdue state changes on a daily cadence — minute polling wasted
    // bandwidth on slow networks without adding clinical value.
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useInvalidateLabSchedules() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["lab-schedules"] });
    qc.invalidateQueries({ queryKey: ["overdue-lab-schedules"] });
  };
}
