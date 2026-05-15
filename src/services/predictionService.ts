import { supabase } from "@/integrations/supabase/client";
import type { LabResult } from "@/types/patient";

export interface PredictionResult {
  prediction_risk: "low" | "medium" | "high";
  score: number;
  message: string;
  reasons: string[];
  timeframe?: string;
  disclaimer: string;
  error?: string;
}

export async function fetchPrediction(
  patientId: string,
  organType: string,
  labs: LabResult[],
  language: string = "en",
  patientData?: { blood_type?: string | null; donor_blood_type?: string | null; titer_therapy?: boolean | null },
): Promise<PredictionResult> {
  const fallback: PredictionResult = {
    prediction_risk: "low",
    score: 0,
    message: "AI prediction unavailable.",
    reasons: [],
    disclaimer: "This prediction is AI-assisted and should be reviewed by a healthcare professional.",
  };
  try {
    const { data, error } = await supabase.functions.invoke("predict-rejection", {
      body: { patient_id: patientId, organ_type: organType, labs, language, patient_data: patientData },
    });
    if (error) {
      console.warn("[prediction] edge function error, using fallback:", error);
      return { ...fallback, error: error.message };
    }
    return data as PredictionResult;
  } catch (e) {
    console.warn("[prediction] unexpected error, using fallback:", e);
    return { ...fallback, error: e instanceof Error ? e.message : "Unknown" };
  }
}
