
-- ============================================================
-- MISSING LAB MONITORING ENGINE
-- ============================================================

-- 1. Schema extensions on lab_schedules
ALTER TABLE public.lab_schedules
  ADD COLUMN IF NOT EXISTS expected_panel text,
  ADD COLUMN IF NOT EXISTS grace_hours integer,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_lab_schedules_open
  ON public.lab_schedules (scheduled_date)
  WHERE completed_lab_id IS NULL AND deleted_at IS NULL;

-- 2. Schema extensions on patient_alerts (metadata for missing_lab alerts)
ALTER TABLE public.patient_alerts
  ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES public.lab_schedules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_by_upload uuid REFERENCES public.lab_results(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS overdue_days integer,
  ADD COLUMN IF NOT EXISTS overdue_hours integer,
  ADD COLUMN IF NOT EXISTS transplant_phase text,
  ADD COLUMN IF NOT EXISTS escalation_level text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_missing_lab_per_schedule
  ON public.patient_alerts (patient_id, schedule_id)
  WHERE alert_type = 'missing_lab' AND status IN ('new','acknowledged');

-- 3. Extend audit allow-list
CREATE OR REPLACE FUNCTION public.log_audit_event(_action text, _entity_type text DEFAULT NULL::text, _entity_id uuid DEFAULT NULL::uuid, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    -- Allow internal cron / trigger context (no auth) for system-emitted audit events
    IF _action NOT IN ('missing_lab_detected','missing_lab_resolved') THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;
  END IF;
  IF _action NOT IN (
    'user_login','patient_login','lab_upload','lab_result_edit',
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

-- 4. Lock down new metadata columns from patient mutation
CREATE OR REPLACE FUNCTION public.enforce_patient_alert_update_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _is_clinician boolean;
BEGIN
  _is_clinician := public.has_role(auth.uid(), 'admin'::app_role)
                OR public.has_role(auth.uid(), 'doctor'::app_role)
                OR public.has_role(auth.uid(), 'support'::app_role);
  IF _is_clinician OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

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
     OR NEW.schedule_id IS DISTINCT FROM OLD.schedule_id
     OR NEW.resolved_by_upload IS DISTINCT FROM OLD.resolved_by_upload
     OR NEW.overdue_days IS DISTINCT FROM OLD.overdue_days
     OR NEW.overdue_hours IS DISTINCT FROM OLD.overdue_hours
     OR NEW.transplant_phase IS DISTINCT FROM OLD.transplant_phase
     OR NEW.escalation_level IS DISTINCT FROM OLD.escalation_level
  THEN
    RAISE EXCEPTION 'Patients may only mark alerts as read' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Core detection function (schedule-driven, no fixed intervals)
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
BEGIN
  FOR _row IN
    SELECT s.id AS schedule_id, s.patient_id, s.scheduled_date, s.expected_panel,
           s.grace_hours, p.transplant_date, p.organ_type, p.assigned_doctor_id
    FROM public.lab_schedules s
    JOIN public.patients p ON p.id = s.patient_id
    WHERE s.completed_lab_id IS NULL
      AND s.deleted_at IS NULL
      AND s.scheduled_date <= CURRENT_DATE
  LOOP
    -- Transplant phase
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

    -- Grace period: schedule override > phase fallback
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

    -- Severity / escalation
    IF _phase = 'early_post_tx' THEN
      IF _overdue_hours > 48 THEN
        _severity := 'critical'; _escalation := 'critical_early_tx';
      ELSIF _overdue_hours > 24 THEN
        _severity := 'high'; _escalation := 'high_early_tx';
      ELSE
        _severity := 'warning'; _escalation := 'warning';
      END IF;
    ELSE
      IF _overdue_days > 7 THEN
        _severity := 'critical'; _escalation := 'critical_long_overdue';
      ELSIF _overdue_days > 3 THEN
        _severity := 'high'; _escalation := 'high_overdue';
      ELSE
        _severity := 'warning'; _escalation := 'warning';
      END IF;
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
      _row.scheduled_date,
      _overdue_days,
      _overdue_hours,
      _phase,
      COALESCE(_row.expected_panel, 'standart'),
      COALESCE(_last_lab_date::text, 'mavjud emas')
    );

    -- Dedup
    SELECT id, severity INTO _existing_id, _existing_sev
    FROM public.patient_alerts
    WHERE patient_id = _row.patient_id
      AND schedule_id = _row.schedule_id
      AND alert_type = 'missing_lab'
      AND status IN ('new','acknowledged')
    LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      UPDATE public.patient_alerts
      SET overdue_days = _overdue_days,
          overdue_hours = _overdue_hours,
          escalation_level = _escalation,
          transplant_phase = _phase,
          severity = _severity,
          title = _title,
          message = _message
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
          'patient_id', _row.patient_id,
          'schedule_id', _row.schedule_id,
          'overdue_days', _overdue_days,
          'overdue_hours', _overdue_hours,
          'phase', _phase,
          'severity', _severity
        )
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('created', _created, 'updated', _updated, 'ran_at', _now);
END;
$function$;

-- 6. Auto-resolve trigger on lab_results insert
CREATE OR REPLACE FUNCTION public.auto_resolve_missing_lab_alerts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _schedule_id uuid;
  _alert_id uuid;
  _lab_date date := NEW.recorded_at::date;
BEGIN
  -- Preferred path: explicit schedule linkage via lab_schedules.completed_lab_id (set by autoCompleteSchedules)
  SELECT id INTO _schedule_id
  FROM public.lab_schedules
  WHERE patient_id = NEW.patient_id AND completed_lab_id = NEW.id
  LIMIT 1;

  -- Fallback: ±2 day match, oldest open schedule only (never resolve multiple)
  IF _schedule_id IS NULL THEN
    SELECT id INTO _schedule_id
    FROM public.lab_schedules
    WHERE patient_id = NEW.patient_id
      AND completed_lab_id IS NULL
      AND deleted_at IS NULL
      AND scheduled_date BETWEEN (_lab_date - 2) AND (_lab_date + 2)
    ORDER BY scheduled_date ASC
    LIMIT 1;
  END IF;

  IF _schedule_id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.patient_alerts
  SET status = 'resolved',
      resolved_at = now(),
      resolved_by_upload = NEW.id,
      resolution_note = 'Automatically resolved after lab upload',
      is_read = true
  WHERE patient_id = NEW.patient_id
    AND schedule_id = _schedule_id
    AND alert_type = 'missing_lab'
    AND status IN ('new','acknowledged')
  RETURNING id INTO _alert_id;

  IF _alert_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (
      NULL, 'missing_lab_resolved', 'patient_alert', _alert_id,
      jsonb_build_object(
        'patient_id', NEW.patient_id,
        'schedule_id', _schedule_id,
        'lab_result_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_resolve_missing_lab ON public.lab_results;
CREATE TRIGGER trg_auto_resolve_missing_lab
AFTER INSERT ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.auto_resolve_missing_lab_alerts();
