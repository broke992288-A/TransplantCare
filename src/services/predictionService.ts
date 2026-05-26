import { supabase } from "@/integrations/supabase/client";
import type { LabResult } from "@/types/patient";

export interface PredictionResult {
  available: boolean;
  prediction_risk: "low" | "medium" | "high" | null;
  score: number | null;
  message: string;
  reasons: string[];
  timeframe?: string;
  disclaimer: string;
  error?: string;
}

const UNAVAILABLE: PredictionResult = {
  available: false,
  prediction_risk: null,
  score: null,
  message: "Prediction unavailable — manual clinical review required",
  reasons: [],
  disclaimer: "This prediction is AI-assisted and should be reviewed by a healthcare professional.",
};

export async function fetchPrediction(
  patientId: string,
  organType: string,
  labs: LabResult[],
  language: string = "en",
  patientData?: { blood_type?: string | null; donor_blood_type?: string | null; titer_therapy?: boolean | null },
): Promise<PredictionResult> {
  try {
    const { data, error } = await supabase.functions.invoke("predict-rejection", {
      body: { patient_id: patientId, organ_type: organType, labs, language, patient_data: patientData },
    });
    if (error) {
      console.warn("[prediction] edge function error:", error);
      return { ...UNAVAILABLE, error: error.message };
    }
    if (!data || data.error) {
      return { ...UNAVAILABLE, error: data?.error };
    }
    return { available: true, ...(data as Omit<PredictionResult, "available">) };
  } catch (e) {
    console.warn("[prediction] unexpected error:", e);
    return { ...UNAVAILABLE, error: e instanceof Error ? e.message : "Unknown" };
  }
}
