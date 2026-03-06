import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const WATCHED_TABLES = [
  { table: "patients", queryKeys: ["doctor-patients", "doctor-patients-with-labs", "all-patients", "patient", "linked-patient"] },
  { table: "lab_results", queryKeys: ["patient-labs", "latest-labs-map", "doctor-patients-with-labs"] },
  { table: "risk_snapshots", queryKeys: ["risk-snapshots", "risk-snapshot-latest"] },
  { table: "patient_alerts", queryKeys: ["patient-alerts", "patient-alerts-unread"] },
] as const;

export function useRealtimeInvalidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("global-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => {
        WATCHED_TABLES[0].queryKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_results" }, () => {
        WATCHED_TABLES[1].queryKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "risk_snapshots" }, () => {
        WATCHED_TABLES[2].queryKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_alerts" }, () => {
        WATCHED_TABLES[3].queryKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
