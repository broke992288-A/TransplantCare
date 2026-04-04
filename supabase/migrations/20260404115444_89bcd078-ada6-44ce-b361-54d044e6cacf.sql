
-- Add BK virus, CMV, and DSA columns to lab_results
ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS bk_virus_load numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cmv_load numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dsa_mfi numeric DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.lab_results.bk_virus_load IS 'BK Virus load in copies/ml (PCR)';
COMMENT ON COLUMN public.lab_results.cmv_load IS 'CMV viral load in copies/ml (PCR)';
COMMENT ON COLUMN public.lab_results.dsa_mfi IS 'Donor-Specific Antibody Mean Fluorescence Intensity';
