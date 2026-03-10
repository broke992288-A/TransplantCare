import { useQuery } from "@tanstack/react-query";
import { fetchPrediction } from "@/services/predictionService";
import { fetchLabsByPatientId } from "@/services/labService";

export function usePrediction(
  patientId: string | undefined,
  organType: string | undefined,
) {
  return useQuery({
    queryKey: ["prediction", patientId],
    queryFn: async () => {
      const labs = await fetchLabsByPatientId(patientId!, 5);
      if (labs.length < 2) {
        return {
          prediction_risk: "low" as const,
          score: 0,
          message: "Insufficient lab data for prediction.",
          reasons: [],
          disclaimer: "This prediction is AI-assisted and should be reviewed by a healthcare professional.",
        };
      }
      try {
        return await fetchPrediction(patientId!, organType!, labs);
      } catch (err) {
        console.warn("Prediction fetch failed, returning fallback:", err);
        return {
          prediction_risk: "low" as const,
          score: 0,
          message: "Unable to generate prediction at this time.",
          reasons: [],
          disclaimer: "This prediction is AI-assisted and should be reviewed by a healthcare professional.",
          error: "Service temporarily unavailable",
        };
      }
    },
    enabled: !!patientId && !!organType,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    meta: { suppressError: true },
  });
}
