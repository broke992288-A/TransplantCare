import { supabase } from "@/integrations/supabase/client";

export interface RecalculationResult {
  success: boolean;
  algorithm_version?: string;
  patients_processed?: number;
  snapshots_created?: number;
  alerts_generated?: number;
  error?: string;
}

/**
 * Trigger historical risk recalculation for all patients or a single patient.
 */
export async function triggerRiskRecalculation(patientId?: string): Promise<RecalculationResult> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/recalculate-risk`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify(patientId ? { patient_id: patientId } : {}),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Recalculation failed: ${text}`);
  }

  return res.json();
}
