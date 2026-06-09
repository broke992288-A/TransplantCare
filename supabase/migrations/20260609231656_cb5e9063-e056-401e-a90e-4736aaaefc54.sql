
-- 1. Mark historical risk snapshots so sync trigger can skip them
ALTER TABLE public.risk_snapshots
  ADD COLUMN IF NOT EXISTS is_historical boolean NOT NULL DEFAULT false;

-- 2. Sync trigger: never update current patient state from historical snapshot
CREATE OR REPLACE FUNCTION public.sync_patient_risk_from_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF COALESCE(NEW.is_historical, false) THEN
    RETURN NEW;
  END IF;
  UPDATE public.patients
  SET risk_level = NEW.risk_level,
      risk_score = NEW.score::integer,
      last_risk_evaluation = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.patient_id;
  RETURN NEW;
END;
$function$;

-- 3. Abnormal-lab alert trigger: skip historical rows (recorded > 7 days ago)
CREATE OR REPLACE FUNCTION public.check_lab_abnormal_and_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _organ_type text;
  _flags text[] := '{}';
  _severity text := 'warning';
  _threshold RECORD;
  _value numeric;
  _param_map jsonb;
  _message text;
  _dup_count integer;
BEGIN
  -- Historical import isolation: do not alert on labs older than 7 days
  IF NEW.recorded_at IS NOT NULL AND NEW.recorded_at < (now() - interval '7 days') THEN
    RETURN NEW;
  END IF;

  SELECT organ_type INTO _organ_type FROM public.patients WHERE id = NEW.patient_id;
  IF _organ_type IS NULL THEN RETURN NEW; END IF;

  _param_map := jsonb_build_object(
    'creatinine', NEW.creatinine, 'egfr', NEW.egfr, 'potassium', NEW.potassium,
    'proteinuria', NEW.proteinuria, 'tacrolimus', NEW.tacrolimus_level,
    'alt', NEW.alt, 'ast', NEW.ast, 'total_bilirubin', NEW.total_bilirubin,
    'direct_bilirubin', NEW.direct_bilirubin, 'hb', NEW.hb,
    'platelets', NEW.platelets, 'inr', NEW.inr, 'alp', NEW.alp,
    'ggt', NEW.ggt, 'albumin', NEW.albumin, 'crp', NEW.crp
  );

  FOR _threshold IN
    SELECT * FROM public.clinical_thresholds WHERE organ_type = _organ_type
  LOOP
    _value := (_param_map ->> _threshold.parameter)::numeric;
    IF _value IS NULL THEN CONTINUE; END IF;

    IF (_threshold.critical_min IS NOT NULL AND _value >= _threshold.critical_min)
       OR (_threshold.critical_max IS NOT NULL AND _value <= _threshold.critical_max) THEN
      _flags := array_append(_flags, _threshold.parameter || ': ' || _value || ' ' || _threshold.unit ||
        ' (norma ' || COALESCE(_threshold.normal_min::text, '') || '-' || COALESCE(_threshold.normal_max::text, '') || ') [' || _threshold.guideline_source || ']');
      _severity := 'critical';
    ELSIF (_threshold.warning_min IS NOT NULL AND _value >= _threshold.warning_min)
       OR (_threshold.warning_max IS NOT NULL AND _value <= _threshold.warning_max) THEN
      _flags := array_append(_flags, _threshold.parameter || ': ' || _value || ' ' || _threshold.unit ||
        ' (norma ' || COALESCE(_threshold.normal_min::text, '') || '-' || COALESCE(_threshold.normal_max::text, '') || ') [' || _threshold.guideline_source || ']');
    END IF;
  END LOOP;

  IF array_length(_flags, 1) > 0 THEN
    _message := array_to_string(_flags, '; ');
    SELECT COUNT(*) INTO _dup_count
    FROM public.patient_alerts
    WHERE patient_id = NEW.patient_id
      AND alert_type = 'lab_abnormal'
      AND message = _message
      AND status IN ('new', 'acknowledged')
      AND created_at >= (now() - interval '24 hours');

    IF _dup_count = 0 THEN
      INSERT INTO public.patient_alerts (patient_id, alert_type, severity, title, message)
      VALUES (
        NEW.patient_id,
        'lab_abnormal',
        _severity,
        CASE WHEN _severity = 'critical'
             THEN 'Shifokor bilan maslahatlashish tavsiya etiladi'
             ELSE 'Tahlil natijasi e''tiborga loyiq'
        END,
        _message
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. insert_lab_and_recalculate: historical isolation
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
  IF NOT public.can_access_patient(_patient_id) THEN
    RAISE EXCEPTION 'Permission denied for patient %', _patient_id USING ERRCODE = '42501';
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

-- 5. Ensure every active patient has at least one future active schedule
CREATE OR REPLACE FUNCTION public.ensure_patient_has_active_schedule(_patient_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _has_future boolean;
  _transplant_date date;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.lab_schedules
    WHERE patient_id = _patient_id
      AND completed_lab_id IS NULL
      AND deleted_at IS NULL
      AND scheduled_date >= CURRENT_DATE
  ) INTO _has_future;

  IF _has_future THEN RETURN; END IF;

  SELECT transplant_date INTO _transplant_date
  FROM public.patients WHERE id = _patient_id;

  IF _transplant_date IS NOT NULL THEN
    PERFORM public.generate_lab_schedule(_patient_id, _transplant_date);
  ELSE
    INSERT INTO public.lab_schedules (patient_id, scheduled_date, status, expected_panel)
    VALUES (_patient_id, CURRENT_DATE + 7, 'upcoming', 'standard')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$;

-- 6. Trigger to auto-ensure on patient INSERT
CREATE OR REPLACE FUNCTION public.trg_ensure_active_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.ensure_patient_has_active_schedule(NEW.id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_patient_ensure_schedule ON public.patients;
CREATE TRIGGER trg_patient_ensure_schedule
  AFTER INSERT ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.trg_ensure_active_schedule();

-- 7. detect_missing_labs: ensure every patient has a future schedule before scanning
CREATE OR REPLACE FUNCTION public.detect_missing_labs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _row RECORD;
  _now timestamptz := now();
  _grace_hours integer;
  _phase_days integer;
  _phase text;
  _overdue_hours integer;
  _overdue_days integer;
  _severity text;
  _escalation text;
  _title text;
  _message text;
  _last_lab_date timestamptz;
  _existing_id uuid;
  _existing_sev text;
  _created integer := 0;
  _updated integer := 0;
  _ensured integer := 0;
  _p RECORD;
BEGIN
  -- Guarantee schedule coverage for every patient
  FOR _p IN
    SELECT id FROM public.patients pat
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lab_schedules s
      WHERE s.patient_id = pat.id
        AND s.completed_lab_id IS NULL
        AND s.deleted_at IS NULL
        AND s.scheduled_date >= CURRENT_DATE
    )
  LOOP
    PERFORM public.ensure_patient_has_active_schedule(_p.id);
    _ensured := _ensured + 1;
  END LOOP;

  FOR _row IN
    SELECT s.id AS schedule_id, s.patient_id, s.scheduled_date, s.expected_panel,
           s.grace_hours, p.transplant_date, p.organ_type, p.assigned_doctor_id
    FROM public.lab_schedules s
    JOIN public.patients p ON p.id = s.patient_id
    WHERE s.completed_lab_id IS NULL
      AND s.deleted_at IS NULL
      AND s.scheduled_date <= CURRENT_DATE
  LOOP
    IF _row.transplant_date IS NULL THEN
      _phase_days := NULL;
      _phase := 'pre_transplant';
    ELSE
      _phase_days := (CURRENT_DATE - _row.transplant_date);
      _phase := CASE
        WHEN _phase_days <= 30 THEN 'early_post_tx'
        WHEN _phase_days <= 180 THEN 'mid_post_tx'
        ELSE 'late_post_tx'
      END;
    END IF;

    _grace_hours := COALESCE(
      _row.grace_hours,
      CASE
        WHEN _phase_days IS NOT NULL AND _phase_days <= 30 THEN 12
        WHEN _phase_days IS NOT NULL AND _phase_days <= 180 THEN 24
        ELSE 48
      END
    );

    _overdue_hours := GREATEST(0,
      EXTRACT(EPOCH FROM (_now - (_row.scheduled_date::timestamptz + (_grace_hours || ' hours')::interval))) / 3600
    )::integer;

    IF _overdue_hours <= 0 THEN CONTINUE; END IF;
    _overdue_days := _overdue_hours / 24;

    IF _phase = 'early_post_tx' THEN
      IF _overdue_hours > 48 THEN _severity := 'critical'; _escalation := 'critical_early_tx';
      ELSIF _overdue_hours > 24 THEN _severity := 'high'; _escalation := 'high_early_tx';
      ELSE _severity := 'warning'; _escalation := 'warning'; END IF;
    ELSE
      IF _overdue_days > 7 THEN _severity := 'critical'; _escalation := 'critical_long_overdue';
      ELSIF _overdue_days > 3 THEN _severity := 'high'; _escalation := 'high_overdue';
      ELSE _severity := 'warning'; _escalation := 'warning'; END IF;
    END IF;

    SELECT MAX(recorded_at) INTO _last_lab_date
    FROM public.lab_results
    WHERE patient_id = _row.patient_id AND deleted_at IS NULL;

    _title := CASE _severity
      WHEN 'critical' THEN 'KRITIK: tahlil topshirilmadi'
      WHEN 'high' THEN 'Diqqat: tahlil kechikmoqda'
      ELSE 'Eslatma: rejalashtirilgan tahlil kutilmoqda'
    END;

    _message := format(
      'Rejalashtirilgan sana: %s. Kechikish: %s kun (%s soat). Bosqich: %s. Kutilgan panel: %s. So''nggi tahlil: %s',
      _row.scheduled_date, _overdue_days, _overdue_hours, _phase,
      COALESCE(_row.expected_panel, 'standart'),
      COALESCE(_last_lab_date::text, 'mavjud emas')
    );

    SELECT id, severity INTO _existing_id, _existing_sev
    FROM public.patient_alerts
    WHERE patient_id = _row.patient_id
      AND schedule_id = _row.schedule_id
      AND alert_type = 'missing_lab'
      AND status IN ('new','acknowledged')
    LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      UPDATE public.patient_alerts
      SET overdue_days = _overdue_days, overdue_hours = _overdue_hours,
          escalation_level = _escalation, transplant_phase = _phase,
          severity = _severity, title = _title, message = _message
      WHERE id = _existing_id;
      _updated := _updated + 1;
    ELSE
      INSERT INTO public.patient_alerts (
        patient_id, schedule_id, alert_type, severity, title, message,
        overdue_days, overdue_hours, transplant_phase, escalation_level, status, is_read
      ) VALUES (
        _row.patient_id, _row.schedule_id, 'missing_lab', _severity, _title, _message,
        _overdue_days, _overdue_hours, _phase, _escalation, 'new', false
      );
      _created := _created + 1;

      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
      VALUES (
        NULL, 'missing_lab_detected', 'lab_schedule', _row.schedule_id,
        jsonb_build_object(
          'patient_id', _row.patient_id, 'schedule_id', _row.schedule_id,
          'overdue_days', _overdue_days, 'overdue_hours', _overdue_hours,
          'phase', _phase, 'severity', _severity
        )
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('created', _created, 'updated', _updated, 'ensured_schedules', _ensured, 'ran_at', _now);
END;
$function$;

-- 8. Backfill: ensure existing patients without schedule get one now
DO $$
DECLARE _p RECORD;
BEGIN
  FOR _p IN
    SELECT id FROM public.patients pat
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lab_schedules s
      WHERE s.patient_id = pat.id
        AND s.completed_lab_id IS NULL
        AND s.deleted_at IS NULL
        AND s.scheduled_date >= CURRENT_DATE
    )
  LOOP
    PERFORM public.ensure_patient_has_active_schedule(_p.id);
  END LOOP;
END $$;
