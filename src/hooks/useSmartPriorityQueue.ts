import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchDoctorPatients } from "@/services/patientService";
import { fetchLatestLabsByPatientIds, type LatestLabSummary } from "@/services/labService";
import { computeSmartPriority, comparePriority, type SmartPriorityResult } from "@/utils/smartPriority";

export interface SmartPatient {
  id: string;
  full_name: string;
  organ_type: string;
  risk_level: string;
  risk_score: number | null;
  transplant_date: string | null;
  last_risk_evaluation: string | null;
  patient_number: number | null;
  priority: SmartPriorityResult;
  latestLab: LatestLabSummary | null;
}

async function fetchPreviousLabs(patientIds: string[]): Promise<Record<string, LatestLabSummary>> {
  if (patientIds.length === 0) return {};
  // Get 2nd most recent lab per patient by fetching top 2 and picking #2
  const { data, error } = await supabase
    .from("lab_results")
    .select("patient_id, tacrolimus_level, creatinine, alt, ast, total_bilirubin, egfr, potassium, recorded_at")
    .in("patient_id", patientIds)
    .order("recorded_at", { ascending: false });
  if (error) throw error;

  const countMap: Record<string, number> = {};
  const prevMap: Record<string, LatestLabSummary> = {};
  data?.forEach((l) => {
    countMap[l.patient_id] = (countMap[l.patient_id] ?? 0) + 1;
    if (countMap[l.patient_id] === 2) {
      prevMap[l.patient_id] = l as LatestLabSummary;
    }
  });
  return prevMap;
}

async function fetchOverduePatientIds(patientIds: string[]): Promise<Set<string>> {
  if (patientIds.length === 0) return new Set();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("lab_schedules")
    .select("patient_id")
    .in("patient_id", patientIds)
    .eq("status", "overdue")
    .lt("scheduled_date", today);
  if (error) throw error;
  return new Set((data ?? []).map(d => d.patient_id));
}

async function fetchMissedMedDays(patientIds: string[]): Promise<Record<string, number>> {
  if (patientIds.length === 0) return {};
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("medication_adherence")
    .select("patient_id, taken, scheduled_date")
    .in("patient_id", patientIds)
    .eq("taken", false)
    .gte("scheduled_date", threeDaysAgo);
  if (error) throw error;

  const missed: Record<string, Set<string>> = {};
  (data ?? []).forEach(d => {
    if (!missed[d.patient_id]) missed[d.patient_id] = new Set();
    missed[d.patient_id].add(d.scheduled_date);
  });
  const result: Record<string, number> = {};
  Object.entries(missed).forEach(([pid, dates]) => { result[pid] = dates.size; });
  return result;
}

export function useSmartPriorityQueue() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["smart-priority-queue", user?.id],
    queryFn: async (): Promise<SmartPatient[]> => {
      const patients = await fetchDoctorPatients(user!.id);
      const ids = patients.map(p => p.id);

      const [latestLabs, previousLabs, overdueSet, missedMap] = await Promise.all([
        fetchLatestLabsByPatientIds(ids),
        fetchPreviousLabs(ids),
        fetchOverduePatientIds(ids),
        fetchMissedMedDays(ids),
      ]);

      const result: SmartPatient[] = patients.map(p => {
        const latest = latestLabs[p.id] ?? null;
        const previous = previousLabs[p.id] ?? null;
        const priority = computeSmartPriority(
          { risk_level: p.risk_level, risk_score: p.risk_score, organ_type: p.organ_type },
          { latest, previous },
          overdueSet.has(p.id),
          missedMap[p.id] ?? 0,
        );
        return {
          id: p.id,
          full_name: p.full_name,
          organ_type: p.organ_type,
          risk_level: p.risk_level,
          risk_score: p.risk_score,
          transplant_date: p.transplant_date,
          last_risk_evaluation: p.last_risk_evaluation,
          patient_number: p.patient_number,
          priority,
          latestLab: latest,
        };
      });

      result.sort((a, b) => comparePriority(a.priority, b.priority));
      return result;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
