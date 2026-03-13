
-- Section 2: Missing indexes for patient_events and medication_changes
CREATE INDEX IF NOT EXISTS idx_patient_events_patient_id ON public.patient_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_changes_patient_id ON public.medication_changes(patient_id);

-- Section 8: Transplant episodes table
CREATE TABLE IF NOT EXISTS public.transplant_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  organ_type text NOT NULL,
  transplant_date date,
  episode_number integer NOT NULL DEFAULT 1,
  donor_type text DEFAULT 'deceased',
  status text NOT NULL DEFAULT 'active',
  donor_blood_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transplant_episodes ENABLE ROW LEVEL SECURITY;

-- RLS: Doctors/admins can manage, patients can view own
CREATE POLICY "Authorized users see transplant episodes" ON public.transplant_episodes
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = transplant_episodes.patient_id
    AND (p.assigned_doctor_id = auth.uid() OR p.linked_user_id = auth.uid()
         OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  ));

CREATE POLICY "Doctors can manage transplant episodes" ON public.transplant_episodes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

-- Section 4: Atomic lab insert + risk snapshot + patient update function
CREATE OR REPLACE FUNCTION public.insert_lab_and_recalculate(
  _lab_data jsonb,
  _risk_score numeric DEFAULT NULL,
  _risk_level text DEFAULT NULL,
  _risk_details jsonb DEFAULT '{}'::jsonb,
  _trend_flags jsonb DEFAULT '[]'::jsonb,
  _algorithm_version text DEFAULT 'v2.0-kdigo2024'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _lab_id uuid;
  _patient_id uuid;
  _snapshot_id uuid;
  _result jsonb;
BEGIN
  _patient_id := (_lab_data->>'patient_id')::uuid;
  IF _patient_id IS NULL THEN
    RAISE EXCEPTION 'patient_id is required';
  END IF;

  -- Step 1: Insert lab result
  INSERT INTO public.lab_results (
    patient_id, recorded_at, hb, tlc, platelets, pti, inr,
    total_bilirubin, direct_bilirubin, ast, alt, alp, ggt,
    total_protein, albumin, urea, creatinine, egfr,
    sodium, potassium, calcium, magnesium, phosphorus,
    uric_acid, crp, esr, ldh, ammonia,
    tacrolimus_level, cyclosporine, proteinuria, report_file_url
  ) VALUES (
    _patient_id,
    COALESCE((_lab_data->>'recorded_at')::timestamptz, now()),
    (_lab_data->>'hb')::numeric, (_lab_data->>'tlc')::numeric,
    (_lab_data->>'platelets')::numeric, (_lab_data->>'pti')::numeric,
    (_lab_data->>'inr')::numeric, (_lab_data->>'total_bilirubin')::numeric,
    (_lab_data->>'direct_bilirubin')::numeric, (_lab_data->>'ast')::numeric,
    (_lab_data->>'alt')::numeric, (_lab_data->>'alp')::numeric,
    (_lab_data->>'ggt')::numeric, (_lab_data->>'total_protein')::numeric,
    (_lab_data->>'albumin')::numeric, (_lab_data->>'urea')::numeric,
    (_lab_data->>'creatinine')::numeric, (_lab_data->>'egfr')::numeric,
    (_lab_data->>'sodium')::numeric, (_lab_data->>'potassium')::numeric,
    (_lab_data->>'calcium')::numeric, (_lab_data->>'magnesium')::numeric,
    (_lab_data->>'phosphorus')::numeric, (_lab_data->>'uric_acid')::numeric,
    (_lab_data->>'crp')::numeric, (_lab_data->>'esr')::numeric,
    (_lab_data->>'ldh')::numeric, (_lab_data->>'ammonia')::numeric,
    (_lab_data->>'tacrolimus_level')::numeric, (_lab_data->>'cyclosporine')::numeric,
    (_lab_data->>'proteinuria')::numeric, _lab_data->>'report_file_url'
  )
  RETURNING id INTO _lab_id;

  -- Step 2: Insert risk snapshot (if risk was calculated)
  IF _risk_score IS NOT NULL THEN
    INSERT INTO public.risk_snapshots (
      patient_id, lab_result_id, score, risk_level,
      creatinine, alt, ast, total_bilirubin, tacrolimus_level,
      details, trend_flags, algorithm_version
    ) VALUES (
      _patient_id, _lab_id, _risk_score, COALESCE(_risk_level, 'low'),
      (_lab_data->>'creatinine')::numeric, (_lab_data->>'alt')::numeric,
      (_lab_data->>'ast')::numeric, (_lab_data->>'total_bilirubin')::numeric,
      (_lab_data->>'tacrolimus_level')::numeric,
      _risk_details, _trend_flags, _algorithm_version
    )
    RETURNING id INTO _snapshot_id;

    -- Step 3: Update patient risk (sync_patient_risk_from_snapshot trigger handles this)
    -- But we explicitly update here for atomicity
    UPDATE public.patients
    SET risk_level = COALESCE(_risk_level, 'low'),
        risk_score = _risk_score::integer,
        last_risk_evaluation = now(),
        updated_at = now()
    WHERE id = _patient_id;
  END IF;

  _result := jsonb_build_object(
    'lab_id', _lab_id,
    'snapshot_id', _snapshot_id,
    'patient_id', _patient_id
  );
  RETURN _result;
END;
$$;
