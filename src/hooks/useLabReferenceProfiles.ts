import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LabReferenceProfile {
  id: string;
  country: string;
  organ_type: string;
  test_name: string;
  min_value: number | null;
  max_value: number | null;
  unit: string;
  version: string;
}

export function useLabReferenceProfiles(country: string | null, organType: string | null) {
  return useQuery({
    queryKey: ["lab-reference-profiles", country, organType],
    queryFn: async () => {
      let query = supabase
        .from("lab_reference_profiles")
        .select("*")
        .order("test_name");

      if (country) query = query.eq("country", country);
      if (organType) query = query.eq("organ_type", organType);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as LabReferenceProfile[];
    },
    enabled: !!country && !!organType,
  });
}

/** Get available countries from lab_reference_profiles */
export function useLabCountries() {
  return useQuery({
    queryKey: ["lab-countries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_reference_profiles")
        .select("country");
      if (error) throw error;
      const unique = [...new Set((data ?? []).map((r) => r.country))];
      return unique.sort();
    },
  });
}
