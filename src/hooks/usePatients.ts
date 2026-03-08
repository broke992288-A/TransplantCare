import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchDoctorPatients,
  fetchAllPatients,
  fetchLinkedPatient,
  fetchPaginatedPatients,
  type PatientFilters,
} from "@/services/patientService";
import { fetchLatestLabsByPatientIds } from "@/services/labService";

export function useDoctorPatients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["doctor-patients", user?.id],
    queryFn: () => fetchDoctorPatients(user!.id),
    enabled: !!user,
  });
}

export function useDoctorPatientsWithLabs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["doctor-patients-with-labs", user?.id],
    queryFn: async () => {
      const patients = await fetchDoctorPatients(user!.id);
      const labs = await fetchLatestLabsByPatientIds(patients.map((p) => p.id));
      return { patients, labs };
    },
    enabled: !!user,
  });
}

export function useAllPatients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all-patients"],
    queryFn: fetchAllPatients,
    enabled: !!user,
  });
}

/** Server-side paginated patient list */
export function usePaginatedPatients(page: number, pageSize: number, filters?: PatientFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["paginated-patients", page, pageSize, filters],
    queryFn: () => fetchPaginatedPatients(page, pageSize, filters),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}

export function useLinkedPatient() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["linked-patient", user?.id],
    queryFn: () => fetchLinkedPatient(user!.id),
    enabled: !!user,
  });
}
