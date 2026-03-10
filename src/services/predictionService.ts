import { supabase } from "@/integrations/supabase/client";

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
  labs: any[]
): Promise<PredictionResult> {
  const { data, error } = await supabase.functions.invoke("predict-rejection", {
    body: { patient_id: patientId, organ_type: organType, labs },
  });

  if (error) throw error;
  return data as PredictionResult;
}
