CREATE OR REPLACE FUNCTION public.insert_lab_and_recalculate(_lab_data jsonb, _risk_score numeric DEFAULT NULL::numeric, _risk_level text DEFAULT NULL::text, _risk_details jsonb DEFAULT '{}'::jsonb, _trend_flags jsonb DEFAULT '[]'::jsonb, _algorithm_version text DEFAULT 'v2.0-kdigo2024'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
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
  _recorded_at timestamptz;
  _is_historical boolean;
BEGIN
  _patient_id := (_lab_data->>'patient_id')::uuid;
  IF _patient_id IS NULL THEN RAISE EXCEPTION 'patient_id is required'; END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- AUTHORIZATION GATE (same pattern as generate_lab_schedule):
  -- only admins or the patient's assigned doctor may insert labs via this RPC.
  -- Patients (linked_user_id-only) are blocked and must use the OCR-verify flow.
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = _patient_id
        AND p.assigned_doctor_id = auth.uid()
        AND public.has_role(auth.uid(), 'doctor'::app_role)
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: only admins or the assigned doctor can insert labs for patient %', _patient_id USING ERRCODE = '42501';
  END IF;

  _recorded_at := COALESCE((_lab_data->>'recorded_at')::timestamptz, now());
  _is_historical := _recorded_at < (now() - interval '7 days');

  INSERT INTO public.lab_results (
    patient_id, recorded_at, hb, tlc, platelets, pti, inr,
    total_bilirubin, direct_bilirubin, ast, alt, alp, ggt,
    total_protein, albumin, urea, creatinine, egfr,
    sodium, potassium, calcium, magnesium, phosphorus,
    uric_acid, crp, esr, ldh, ammonia, glucose,
    tacrolimus_level, cyclosporine, proteinuria, report_file_url
  ) VALUES (
    _patient_id, _recorded_at,
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

  SELECT organ_type INTO _organ_type FROM public.patients WHERE id = _patient_id;
  _organ_type := COALESCE(_organ_type, 'kidney');

  _risk := public.calculate_risk_score_sql(_organ_type, _patient_id);
  _server_score := COALESCE((_risk->>'score')::integer, 0);
  _server_level := COALESCE(_risk->>'level', 'low');
  _server_version := COALESCE(_risk->>'algorithm_version', 'v5.0-coalesced-window');

  INSERT INTO public.risk_snapshots (
    patient_id, lab_result_id, score, risk_level,
    creatinine, alt, ast, total_bilirubin, tacrolimus_level,
    details, trend_flags, algorithm_version, is_historical
  ) VALUES (
    _patient_id, _lab_id, _server_score, _server_level,
    (_lab_data->>'creatinine')::numeric, (_lab_data->>'alt')::numeric,
    (_lab_data->>'ast')::numeric, (_lab_data->>'total_bilirubin')::numeric,
    (_lab_data->>'tacrolimus_level')::numeric,
    _risk, '[]'::jsonb, _server_version, _is_historical
  ) RETURNING id INTO _snapshot_id;

  -- Only update current patient state for recent labs
  IF NOT _is_historical THEN
    UPDATE public.patients
    SET risk_level = _server_level,
        risk_score = _server_score,
        last_risk_evaluation = now(),
        updated_at = now()
    WHERE id = _patient_id;
  END IF;

  RETURN jsonb_build_object(
    'lab_id', _lab_id, 'snapshot_id', _snapshot_id, 'patient_id', _patient_id,
    'server_score', _server_score, 'server_level', _server_level,
    'algorithm_version', _server_version,
    'is_historical', _is_historical
  );
END;
$function$;