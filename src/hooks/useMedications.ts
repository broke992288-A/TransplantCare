import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPatientMedications,
  insertMedication,
  updateMedication,
  deleteMedication,
  insertMedicationChange,
  fetchMedicationChanges,
} from "@/services/medicationService";

export function usePatientMedications(patientId: string | undefined) {
  return useQuery({
    queryKey: ["medications", patientId],
    queryFn: () => fetchPatientMedications(patientId!),
    enabled: !!patientId,
  });
}

export function useMedicationChanges(patientId: string | undefined) {
  return useQuery({
    queryKey: ["medication-changes", patientId],
    queryFn: () => fetchMedicationChanges(patientId!),
    enabled: !!patientId,
  });
}

export function useAddMedication(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: insertMedication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications", patientId] });
    },
  });
}

export function useUpdateMedication(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateMedication(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications", patientId] });
    },
  });
}

export function useDeleteMedication(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMedication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications", patientId] });
    },
  });
}

export function useChangeDosage(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      medicationId: string;
      patientId: string;
      changedBy: string;
      oldDosage: string;
      newDosage: string;
      oldFrequency?: string;
      newFrequency?: string;
      reason?: string;
    }) => {
      // Update medication
      const updates: any = { dosage: params.newDosage };
      if (params.newFrequency) updates.frequency = params.newFrequency;
      await updateMedication(params.medicationId, updates);
      // Log change (triggers alert automatically)
      await insertMedicationChange({
        medication_id: params.medicationId,
        patient_id: params.patientId,
        changed_by: params.changedBy,
        old_dosage: params.oldDosage,
        new_dosage: params.newDosage,
        old_frequency: params.oldFrequency,
        new_frequency: params.newFrequency,
        reason: params.reason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications", patientId] });
      qc.invalidateQueries({ queryKey: ["medication-changes", patientId] });
      qc.invalidateQueries({ queryKey: ["patient-alerts"] });
    },
  });
}
