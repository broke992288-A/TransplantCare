import { useQuery } from "@tanstack/react-query";
import { fetchPrediction } from "@/services/predictionService";

export function usePrediction(
  patientId: string | undefined,
  organType: string | undefined,
  labs: any[] | undefined
) {
  return useQuery({
    queryKey: ["prediction", patientId],
    queryFn: () => fetchPrediction(patientId!, organType!, labs!),
    enabled: !!patientId && !!organType && !!labs && labs.length >= 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}
