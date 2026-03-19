CREATE SEQUENCE IF NOT EXISTS public.patient_number_seq START 1;

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS patient_number integer UNIQUE DEFAULT nextval('public.patient_number_seq');

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.patients
)
UPDATE public.patients p
SET patient_number = numbered.rn
FROM numbered
WHERE p.id = numbered.id;

SELECT setval('public.patient_number_seq', COALESCE((SELECT MAX(patient_number) FROM public.patients), 0) + 1, false);