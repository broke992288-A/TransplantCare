import { useQuery } from "@tanstack/react-query";
import { fetchPrediction } from "@/services/predictionService";
import type { PredictionResult } from "@/services/predictionService";
import { fetchLabsByPatientId } from "@/services/labService";

const UNAVAILABLE: PredictionResult = {
  available: false,
  prediction_risk: null,
  score: null,
  message: "Prediction unavailable — manual clinical review required",
  reasons: [],
  disclaimer: "This prediction is AI-assisted and should be reviewed by a healthcare professional.",
};

export function usePrediction(
  patientId: string | undefined,
  organType: string | undefined,
  patientData?: { blood_type?: string | null; donor_blood_type?: string | null; titer_therapy?: boolean | null },
) {
  return useQuery<PredictionResult>({
    queryKey: ["prediction", patientId],
    queryFn: async () => {
      const labs = await fetchLabsByPatientId(patientId!, 5);
      if (labs.length < 2) {
        return { ...UNAVAILABLE, message: "Insufficient lab data — manual clinical review required" };
      }
      try {
        return await fetchPrediction(patientId!, organType!, labs, "en", patientData);
      } catch (err) {
        console.warn("Prediction fetch failed:", err);
        return { ...UNAVAILABLE, error: err instanceof Error ? err.message : "Unknown" };
      }
    },
    enabled: !!patientId && !!organType,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    meta: { skipGlobalError: true },
  });
}
