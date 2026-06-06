-- ============================================================
-- SECURITY HARDENING: Authorization gates on SECURITY DEFINER RPCs
-- and column-level lockdown on patient_alerts updates by patients.
-- ============================================================

-- Helper: does the current auth.uid() have clinical access to a patient?
CREATE OR REPLACE FUNCTION public.can_access_patient(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = _patient_id
      AND (
        p.linked_user_id = auth.uid()
        OR p.assigned_doctor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_patient(uuid) TO authenticated, service_role;

-- ---------- ISSUE 1: calculate_risk_score_sql ----------
CREATE OR REPLACE FUNCTION public.calculate_risk_score_sql(_organ_type text, _patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _score integer := 0;
  _level text;
  _lab RECORD;
  _patient RECORD;
  _days_since_tx integer;
  _best_creatinine numeric;
  _country text;
  _cr numeric;
  _bili numeric;
  _dbili numeric;
  _urea numeric;
  _hb numeric;
BEGIN
  -- AUTHORIZATION GATE
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_access_patient(_patient_id) THEN
    RAISE EXCEPTION 'Permission denied for patient %', _patient_id USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _patient FROM public.patients WHERE id = _patient_id;
  IF _patient IS NULL THEN
    RETURN jsonb_build_object('error', 'Patient not found');
  END IF;

  _country := COALESCE(_patient.country, 'uzbekistan');

  SELECT * INTO _lab FROM public.lab_results
    WHERE patient_id = _patient_id
    ORDER BY recorded_at DESC LIMIT 1;

  IF _lab IS NULL THEN
    RETURN jsonb_build_object('score', 0, 'level', 'low', 'details', 'No lab data');
  END IF;

  _cr := COALESCE(_lab.creatinine, 0);
  IF _country = 'uzbekistan' AND _cr > 10 THEN _cr := ROUND(_cr / 88.4, 2); END IF;
  _bili := COALESCE(_lab.total_bilirubin, 0);
  IF _country = 'uzbekistan' AND _bili > 3 THEN _bili := ROUND(_bili / 17.1, 2); END IF;
  _dbili := COALESCE(_lab.direct_bilirubin, 0);
  IF _country = 'uzbekistan' AND _dbili > 1 THEN _dbili := ROUND(_dbili / 17.1, 2); END IF;
  _urea := COALESCE(_lab.urea, 0);
  IF _country = 'uzbekistan' AND _urea > 0 AND _urea < 15 THEN _urea := ROUND(_urea * 6, 2); END IF;
  _hb := COALESCE(_lab.hb, 0);
  IF _country = 'uzbekistan' AND _hb > 30 THEN _hb := ROUND(_hb / 10, 2); END IF;

  IF _patient.transplant_date IS NOT NULL THEN
    _days_since_tx := (CURRENT_DATE - _patient.transplant_date);
    IF _days_since_tx < 0 THEN _days_since_tx := NULL; END IF;
  END IF;

  IF _patient.blood_type IS NOT NULL AND _patient.donor_blood_type IS NOT NULL
     AND _patient.blood_type <> _patient.donor_blood_type THEN
    IF COALESCE(_patient.titer_therapy, false) THEN _score := _score + 10;
    ELSE _score := _score + 25; END IF;
  END IF;
  IF _days_since_tx IS NOT NULL AND _days_since_tx < 90 THEN _score := _score + 10; END IF;
  IF COALESCE(_patient.transplant_number, 1) >= 2 THEN _score := _score + 15; END IF;

  IF _hb > 0 THEN
    IF _hb < 7 THEN _score := _score + CASE WHEN _organ_type = 'kidney' THEN 20 ELSE 15 END;
    ELSIF _hb < 10 THEN _score := _score + CASE WHEN _organ_type = 'kidney' THEN 10 ELSE 5 END;
    END IF;
  END IF;

  IF COALESCE(_lab.crp, 0) > 50 THEN _score := _score + 15;
  ELSIF COALESCE(_lab.crp, 0) > 10 THEN _score := _score + 5; END IF;

  IF COALESCE(_lab.calcium, 0) > 2.75 THEN
    _score := _score + CASE WHEN _organ_type = 'kidney' THEN 15 ELSE 10 END;
  ELSIF COALESCE(_lab.calcium, 0) > 0 AND _lab.calcium < 2.0 THEN
    _score := _score + CASE WHEN _organ_type = 'kidney' THEN 8 ELSE 5 END;
  END IF;

  IF _organ_type = 'liver' THEN
    IF COALESCE(_lab.alt, 0) > 800 THEN _score := _score + 40;
    ELSIF COALESCE(_lab.alt, 0) > 500 THEN _score := _score + 30;
    ELSIF COALESCE(_lab.alt, 0) > 120 THEN _score := _score + 25;
    ELSIF COALESCE(_lab.alt, 0) > 60 THEN _score := _score + 10; END IF;
    IF COALESCE(_lab.ast, 0) > 500 THEN _score := _score + 25;
    ELSIF COALESCE(_lab.ast, 0) > 120 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.ast, 0) > 60 THEN _score := _score + 8; END IF;
    IF _bili > 10.0 THEN _score := _score + 30;
    ELSIF _bili > 3.0 THEN _score := _score + 20;
    ELSIF _bili > 1.5 THEN _score := _score + 10; END IF;
    IF _dbili > 1.5 THEN _score := _score + 10;
    ELSIF _dbili > 0.5 THEN _score := _score + 5; END IF;
    IF COALESCE(_lab.ggt, 0) > 500 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.ggt, 0) > 200 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.ggt, 0) > 60 THEN _score := _score + 8; END IF;
    IF COALESCE(_lab.alp, 0) > 300 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.alp, 0) > 120 THEN _score := _score + 8; END IF;
    IF COALESCE(_lab.inr, 0) > 2.0 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.inr, 0) > 1.5 THEN _score := _score + 10; END IF;
    IF COALESCE(_lab.platelets, 0) > 0 AND _lab.platelets < 50 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.platelets, 0) > 0 AND _lab.platelets < 100 THEN _score := _score + 5; END IF;
    IF COALESCE(_lab.albumin, 0) > 0 AND _lab.albumin < 2.5 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.albumin, 0) > 0 AND _lab.albumin < 3.0 THEN _score := _score + 10; END IF;
    IF COALESCE(_lab.tacrolimus_level, 0) > 0 THEN
      IF COALESCE(_days_since_tx, 999) <= 30 THEN
        IF _lab.tacrolimus_level < 8 THEN _score := _score + 25;
        ELSIF _lab.tacrolimus_level > 10 THEN _score := _score + 15; END IF;
      ELSIF COALESCE(_days_since_tx, 999) <= 180 THEN
        IF _lab.tacrolimus_level < 6 THEN _score := _score + 20;
        ELSIF _lab.tacrolimus_level > 8 THEN _score := _score + 20; END IF;
      ELSE
        IF _lab.tacrolimus_level < 4 THEN _score := _score + 25;
        ELSIF _lab.tacrolimus_level > 7 THEN _score := _score + 25; END IF;
      END IF;
    END IF;
  ELSE
    IF _cr > 4.0 THEN _score := _score + 35;
    ELSIF _cr > 2.5 THEN _score := _score + 30;
    ELSIF _cr > 1.5 THEN _score := _score + 12; END IF;
    SELECT MIN(CASE WHEN _country = 'uzbekistan' AND creatinine > 10 THEN ROUND(creatinine / 88.4, 2) ELSE creatinine END)
      INTO _best_creatinine FROM public.lab_results
      WHERE patient_id = _patient_id AND creatinine IS NOT NULL AND creatinine > 0;
    IF _best_creatinine IS NOT NULL AND _best_creatinine > 0 AND _cr > 0 AND _cr > _best_creatinine * 1.25 THEN
      _score := _score + 35;
    END IF;
    IF COALESCE(_lab.egfr, 999) < 15 THEN _score := _score + 30;
    ELSIF COALESCE(_lab.egfr, 999) < 30 THEN _score := _score + 25;
    ELSIF COALESCE(_lab.egfr, 999) < 45 THEN _score := _score + 12; END IF;
    IF COALESCE(_lab.proteinuria, 0) > 3.0 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.proteinuria, 0) > 1.0 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.proteinuria, 0) > 0.3 THEN _score := _score + 8; END IF;
    IF COALESCE(_lab.potassium, 0) > 6.0 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.potassium, 0) > 5.5 THEN _score := _score + 8;
    ELSIF COALESCE(_lab.potassium, 0) > 0 AND _lab.potassium < 3.5 THEN _score := _score + 8; END IF;
    IF _urea > 40 THEN _score := _score + 15;
    ELSIF _urea > 20 THEN _score := _score + 5; END IF;
    IF COALESCE(_lab.phosphorus, 0) > 1.78 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.phosphorus, 0) > 1.45 THEN _score := _score + 8; END IF;
    IF COALESCE(_lab.magnesium, 0) > 0 AND _lab.magnesium < 0.4 THEN _score := _score + 12;
    ELSIF COALESCE(_lab.magnesium, 0) > 0 AND _lab.magnesium < 0.6 THEN _score := _score + 5; END IF;
    IF COALESCE(_lab.tacrolimus_level, 0) > 0 THEN
      IF COALESCE(_days_since_tx, 999) <= 90 THEN
        IF _lab.tacrolimus_level < 8 THEN _score := _score + 20;
        ELSIF _lab.tacrolimus_level > 12 THEN _score := _score + 15; END IF;
      ELSIF COALESCE(_days_since_tx, 999) <= 365 THEN
        IF _lab.tacrolimus_level < 6 THEN _score := _score + 20;
        ELSIF _lab.tacrolimus_level > 8 THEN _score := _score + 20; END IF;
      ELSE
        IF _lab.tacrolimus_level < 4 THEN _score := _score + 25;
        ELSIF _lab.tacrolimus_level > 6 THEN _score := _score + 25; END IF;
      END IF;
    END IF;
    IF COALESCE(_lab.bk_virus_load, 0) > 10000 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.bk_virus_load, 0) > 1000 THEN _score := _score + 10; END IF;
    IF COALESCE(_lab.cmv_load, 0) > 1000 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.cmv_load, 0) > 500 THEN _score := _score + 8; END IF;
    IF COALESCE(_lab.dsa_mfi, 0) > 5000 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.dsa_mfi, 0) > 1000 THEN _score := _score + 10; END IF;
    IF COALESCE(_patient.dialysis_history, false) THEN _score := _score + 20; END IF;
  END IF;

  _score := LEAST(_score, 100);
  IF _score >= 60 THEN _level := 'high';
  ELSIF _score >= 30 THEN _level := 'medium';
  ELSE _level := 'low'; END IF;

  RETURN jsonb_build_object(
    'score', _score, 'level', _level, 'organ_type', _organ_type,
    'patient_id', _patient_id, 'country', _country,
    'days_since_tx', _days_since_tx,
    'algorithm_version', 'v4.0-full-kdigo-aasld'
  );
END;
$function$;

-- ---------- ISSUE 2: insert_lab_and_recalculate ----------
CREATE OR REPLACE FUNCTION public.insert_lab_and_recalculate(
  _lab_data jsonb, _risk_score numeric DEFAULT NULL::numeric,
  _risk_level text DEFAULT NULL::text, _risk_details jsonb DEFAULT '{}'::jsonb,
  _trend_flags jsonb DEFAULT '[]'::jsonb,
  _algorithm_version text DEFAULT 'v2.0-kdigo2024'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _lab_id uuid; _patient_id uuid; _snapshot_id uuid; _result jsonb;
BEGIN
  _patient_id := (_lab_data->>'patient_id')::uuid;
  IF _patient_id IS NULL THEN RAISE EXCEPTION 'patient_id is required'; END IF;

  -- AUTHORIZATION GATE
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
    ) RETURNING id INTO _snapshot_id;

    UPDATE public.patients
    SET risk_level = COALESCE(_risk_level, 'low'),
        risk_score = _risk_score::integer,
        last_risk_evaluation = now(), updated_at = now()
    WHERE id = _patient_id;
  END IF;

  _result := jsonb_build_object(
    'lab_id', _lab_id, 'snapshot_id', _snapshot_id, 'patient_id', _patient_id
  );
  RETURN _result;
END;
$function$;

-- ---------- ISSUE 4: generate_lab_schedule ----------
CREATE OR REPLACE FUNCTION public.generate_lab_schedule(_patient_id uuid, _transplant_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _organ_type text; _interval_days integer; _next_date date; _count integer := 0;
BEGIN
  -- AUTHORIZATION GATE: allow trigger context (auth.uid() null = DB-level)
  -- only when caller is doctor/admin assigned, or invoked by trigger after RLS-checked patient write.
  IF auth.uid() IS NOT NULL THEN
    IF NOT (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = _patient_id
          AND p.assigned_doctor_id = auth.uid()
          AND public.has_role(auth.uid(), 'doctor'::app_role)
      )
    ) THEN
      RAISE EXCEPTION 'Permission denied to generate lab schedule for patient %', _patient_id USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT organ_type INTO _organ_type FROM public.patients WHERE id = _patient_id;
  _organ_type := COALESCE(_organ_type, 'kidney');

  DELETE FROM public.lab_schedules
  WHERE patient_id = _patient_id AND completed_lab_id IS NULL AND scheduled_date >= CURRENT_DATE;

  _next_date := CURRENT_DATE;
  WHILE _count < 6 LOOP
    IF _organ_type = 'liver' THEN
      IF (_next_date - _transplant_date) <= 30 THEN _interval_days := 3;
      ELSIF (_next_date - _transplant_date) <= 180 THEN _interval_days := 7;
      ELSE _interval_days := 30; END IF;
    ELSE
      IF (_next_date - _transplant_date) <= 90 THEN _interval_days := 7;
      ELSIF (_next_date - _transplant_date) <= 180 THEN _interval_days := 14;
      ELSE _interval_days := 30; END IF;
    END IF;
    _next_date := _next_date + _interval_days;
    INSERT INTO public.lab_schedules (patient_id, scheduled_date, status)
    VALUES (_patient_id, _next_date,
      CASE WHEN _next_date < CURRENT_DATE THEN 'overdue'
           WHEN _next_date <= CURRENT_DATE + 3 THEN 'due_soon'
           ELSE 'upcoming' END)
    ON CONFLICT DO NOTHING;
    _count := _count + 1;
  END LOOP;
END;
$function$;

-- ---------- ISSUE 3: patient_alerts column-level lockdown ----------
-- Patients may only flip is_read. Doctors/admins keep full lifecycle control.
CREATE OR REPLACE FUNCTION public.enforce_patient_alert_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _is_clinician boolean;
BEGIN
  _is_clinician := public.has_role(auth.uid(), 'admin'::app_role)
                OR public.has_role(auth.uid(), 'doctor'::app_role)
                OR public.has_role(auth.uid(), 'support'::app_role);
  IF _is_clinician THEN
    RETURN NEW;
  END IF;

  -- Non-clinician (patient) path: only is_read may change.
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.acknowledged_at IS DISTINCT FROM OLD.acknowledged_at
     OR NEW.acknowledged_by IS DISTINCT FROM OLD.acknowledged_by
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
     OR NEW.resolved_by IS DISTINCT FROM OLD.resolved_by
     OR NEW.resolution_note IS DISTINCT FROM OLD.resolution_note
     OR NEW.severity IS DISTINCT FROM OLD.severity
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.alert_type IS DISTINCT FROM OLD.alert_type
     OR NEW.risk_snapshot_id IS DISTINCT FROM OLD.risk_snapshot_id
     OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
  THEN
    RAISE EXCEPTION 'Patients may only mark alerts as read' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_patient_alert_update_scope ON public.patient_alerts;
CREATE TRIGGER trg_enforce_patient_alert_update_scope
BEFORE UPDATE ON public.patient_alerts
FOR EACH ROW EXECUTE FUNCTION public.enforce_patient_alert_update_scope();
