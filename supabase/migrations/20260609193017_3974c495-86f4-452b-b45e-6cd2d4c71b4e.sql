
-- ============================================================
-- FINAL PILOT HARDENING — RLS scoping, soft delete, server-side risk
-- ============================================================

-- ---------- 1. lab_results: scope doctor writes, remove patient writes ----------
DROP POLICY IF EXISTS "Doctors can insert labs" ON public.lab_results;
DROP POLICY IF EXISTS "Doctors can update labs" ON public.lab_results;
DROP POLICY IF EXISTS "Doctors can delete labs" ON public.lab_results;
DROP POLICY IF EXISTS "Patients can insert own labs" ON public.lab_results;
DROP POLICY IF EXISTS "Patients can update own labs" ON public.lab_results;
DROP POLICY IF EXISTS "Patients can delete own labs" ON public.lab_results;

CREATE POLICY "Assigned doctors insert labs"
ON public.lab_results FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_results.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);

CREATE POLICY "Assigned doctors update labs"
ON public.lab_results FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_results.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_results.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);

-- No DELETE policy → hard deletes are blocked. Soft delete via UPDATE only.

-- ---------- 2. risk_snapshots: scope doctor writes ----------
DROP POLICY IF EXISTS "Doctors can insert risk snapshots" ON public.risk_snapshots;
DROP POLICY IF EXISTS "Doctors can delete risk snapshots" ON public.risk_snapshots;

CREATE POLICY "Assigned doctors insert risk snapshots"
ON public.risk_snapshots FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = risk_snapshots.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);

CREATE POLICY "Assigned doctors delete risk snapshots"
ON public.risk_snapshots FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = risk_snapshots.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);

-- ---------- 3. patient_alerts: scope doctor insert/delete ----------
DROP POLICY IF EXISTS "Doctors can insert patient alerts" ON public.patient_alerts;
DROP POLICY IF EXISTS "Doctors can delete patient alerts" ON public.patient_alerts;

CREATE POLICY "Assigned doctors insert patient alerts"
ON public.patient_alerts FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_alerts.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);

CREATE POLICY "Assigned doctors delete patient alerts"
ON public.patient_alerts FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_alerts.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);

-- ---------- 4. lab_value_provenance: scope doctor writes ----------
DROP POLICY IF EXISTS "Doctors can insert lab provenance" ON public.lab_value_provenance;
DROP POLICY IF EXISTS "Doctors can update lab provenance" ON public.lab_value_provenance;

CREATE POLICY "Assigned doctors insert lab provenance"
ON public.lab_value_provenance FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_value_provenance.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);

CREATE POLICY "Assigned doctors update lab provenance"
ON public.lab_value_provenance FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_value_provenance.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_value_provenance.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);

-- ---------- 5. lab_schedules: scope doctor writes ----------
DROP POLICY IF EXISTS "Doctors can insert lab schedules" ON public.lab_schedules;
DROP POLICY IF EXISTS "Doctors can update lab schedules" ON public.lab_schedules;
DROP POLICY IF EXISTS "Doctors can delete lab schedules" ON public.lab_schedules;

CREATE POLICY "Assigned doctors insert lab schedules"
ON public.lab_schedules FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_schedules.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);

CREATE POLICY "Assigned doctors update lab schedules"
ON public.lab_schedules FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_schedules.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);

CREATE POLICY "Assigned doctors delete lab schedules"
ON public.lab_schedules FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_schedules.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);

-- ---------- 6. lab_results: add delete_reason; soft-delete is via UPDATE ----------
ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS delete_reason text;

-- ---------- 7. audit_logs: explicit immutability ----------
DROP POLICY IF EXISTS "No one can update audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_logs;

CREATE POLICY "No one can update audit logs"
ON public.audit_logs FOR UPDATE TO authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "No one can delete audit logs"
ON public.audit_logs FOR DELETE TO authenticated
USING (false);

-- ---------- 8. log_audit_event allow-list: add lab_result_delete ----------
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _entity_type text DEFAULT NULL::text,
  _entity_id uuid DEFAULT NULL::uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    IF _action NOT IN ('missing_lab_detected','missing_lab_resolved') THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;
  END IF;
  IF _action NOT IN (
    'user_login','patient_login','lab_upload','lab_result_edit','lab_result_delete',
    'doctor_view_patient','patient_logout','password_reset',
    'patient_identity_override','ocr_unknown_unit_confirmed',
    'missing_lab_detected','missing_lab_resolved'
  ) THEN
    RAISE EXCEPTION 'Invalid audit action: %', _action;
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$function$;

-- ---------- 9. insert_lab_and_recalculate: ignore client-supplied scores ----------
-- Keep signature for backward compatibility; recompute server-side.
CREATE OR REPLACE FUNCTION public.insert_lab_and_recalculate(
  _lab_data jsonb,
  _risk_score numeric DEFAULT NULL::numeric,
  _risk_level text DEFAULT NULL::text,
  _risk_details jsonb DEFAULT '{}'::jsonb,
  _trend_flags jsonb DEFAULT '[]'::jsonb,
  _algorithm_version text DEFAULT 'v2.0-kdigo2024'::text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _lab_id uuid;
  _patient_id uuid;
  _snapshot_id uuid;
  _organ_type text;
  _risk jsonb;
  _server_score integer;
  _server_level text;
  _server_version text;
BEGIN
  _patient_id := (_lab_data->>'patient_id')::uuid;
  IF _patient_id IS NULL THEN RAISE EXCEPTION 'patient_id is required'; END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_access_patient(_patient_id) THEN
    RAISE EXCEPTION 'Permission denied for patient %', _patient_id USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.lab_results (
    patient_id, recorded_at, hb, tlc, platelets, pti, inr,
    total_bilirubin, direct_bilirubin, ast, alt, alp, ggt,
    total_protein, albumin, urea, creatinine, egfr,
    sodium, potassium, calcium, magnesium, phosphorus,
    uric_acid, crp, esr, ldh, ammonia, glucose,
    tacrolimus_level, cyclosporine, proteinuria, report_file_url
  ) VALUES (
    _patient_id, COALESCE((_lab_data->>'recorded_at')::timestamptz, now()),
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
    (_lab_data->>'glucose')::numeric,
    (_lab_data->>'tacrolimus_level')::numeric, (_lab_data->>'cyclosporine')::numeric,
    (_lab_data->>'proteinuria')::numeric, _lab_data->>'report_file_url'
  ) RETURNING id INTO _lab_id;

  -- Compute risk server-side. Ignore client-supplied score/level/version.
  SELECT organ_type INTO _organ_type FROM public.patients WHERE id = _patient_id;
  _organ_type := COALESCE(_organ_type, 'kidney');

  _risk := public.calculate_risk_score_sql(_organ_type, _patient_id);
  _server_score := COALESCE((_risk->>'score')::integer, 0);
  _server_level := COALESCE(_risk->>'level', 'low');
  _server_version := COALESCE(_risk->>'algorithm_version', 'v5.0-coalesced-window');

  INSERT INTO public.risk_snapshots (
    patient_id, lab_result_id, score, risk_level,
    creatinine, alt, ast, total_bilirubin, tacrolimus_level,
    details, trend_flags, algorithm_version
  ) VALUES (
    _patient_id, _lab_id, _server_score, _server_level,
    (_lab_data->>'creatinine')::numeric, (_lab_data->>'alt')::numeric,
    (_lab_data->>'ast')::numeric, (_lab_data->>'total_bilirubin')::numeric,
    (_lab_data->>'tacrolimus_level')::numeric,
    _risk, '[]'::jsonb, _server_version
  ) RETURNING id INTO _snapshot_id;

  UPDATE public.patients
  SET risk_level = _server_level,
      risk_score = _server_score,
      last_risk_evaluation = now(),
      updated_at = now()
  WHERE id = _patient_id;

  RETURN jsonb_build_object(
    'lab_id', _lab_id, 'snapshot_id', _snapshot_id, 'patient_id', _patient_id,
    'server_score', _server_score, 'server_level', _server_level,
    'algorithm_version', _server_version
  );
END;
$function$;
