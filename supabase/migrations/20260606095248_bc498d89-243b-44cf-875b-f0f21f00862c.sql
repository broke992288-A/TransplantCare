
-- OCR Safety Sprint A: provenance persistence for every saved lab value.
-- One row per (lab_result_id, field_key). Tracks original OCR text, detected
-- unit, unit_source, conversion applied (if any), extraction source,
-- confidence, and doctor verification status.

CREATE TABLE IF NOT EXISTS public.lab_value_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_result_id uuid NOT NULL REFERENCES public.lab_results(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  field_key text NOT NULL,
  original_text text,
  raw_value numeric,
  normalized_value numeric,
  detected_unit text,
  unit_source text NOT NULL DEFAULT 'unknown'
    CHECK (unit_source IN ('detected','assumed','unknown')),
  confidence integer,
  extraction_source text NOT NULL DEFAULT 'manual'
    CHECK (extraction_source IN (
      'deterministic-pdf','deterministic-text',
      'ai-image','ai-pdf','ai-office','manual'
    )),
  conversion_applied jsonb,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','verified','corrected')),
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lab_result_id, field_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_value_provenance TO authenticated;
GRANT ALL ON public.lab_value_provenance TO service_role;

ALTER TABLE public.lab_value_provenance ENABLE ROW LEVEL SECURITY;

-- Read: anyone who can read the underlying patient
CREATE POLICY "Authorized users see lab provenance"
  ON public.lab_value_provenance FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_value_provenance.patient_id
      AND (p.assigned_doctor_id = auth.uid()
        OR p.linked_user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'support'::app_role))
  ));

-- Insert: doctors / admins
CREATE POLICY "Doctors can insert lab provenance"
  ON public.lab_value_provenance FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Update: doctors / admins (used for verification)
CREATE POLICY "Doctors can update lab provenance"
  ON public.lab_value_provenance FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'doctor'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Delete: admins only (audit safety)
CREATE POLICY "Admins can delete lab provenance"
  ON public.lab_value_provenance FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_provenance_lab_result
  ON public.lab_value_provenance(lab_result_id);
CREATE INDEX IF NOT EXISTS idx_provenance_patient
  ON public.lab_value_provenance(patient_id);
CREATE INDEX IF NOT EXISTS idx_provenance_unverified
  ON public.lab_value_provenance(patient_id) WHERE verification_status = 'unverified';
