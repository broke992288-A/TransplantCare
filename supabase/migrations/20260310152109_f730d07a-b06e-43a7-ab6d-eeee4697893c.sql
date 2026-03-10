
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS donor_blood_type text,
  ADD COLUMN IF NOT EXISTS titer_therapy boolean DEFAULT false;
