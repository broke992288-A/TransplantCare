
-- =============================================================================
-- RISK ENGINE CLINICAL SAFETY SPRINT
-- v5.0-coalesced-window
-- Fixes: partial panels, null semantics, magnitude conversion, alert dedup
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: coalesce latest non-null value per marker within a 14-day window,
--         preferring provenance.normalized_value when available.
-- Returns one jsonb row keyed by parameter name.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.coalesce_recent_lab_values(
  _patient_id uuid,
  _window_days integer DEFAULT 14
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _result jsonb := '{}'::jsonb;
  _missing text[] := ARRAY[]::text[];
  _unverified text[] := ARRAY[]::text[];
  _params text[] := ARRAY[
    'creatinine','egfr','potassium','proteinuria','urea','phosphorus','magnesium','calcium',
    'alt','ast','total_bilirubin','direct_bilirubin','ggt','alp','inr','albumin','platelets',
    'tacrolimus_level','cyclosporine','hb','crp','bk_virus_load','cmv_load','dsa_mfi'
  ];
  _p text;
  _val numeric;
  _is_unverified boolean;
BEGIN
  IF _patient_id IS NULL THEN RETURN '{}'::jsonb; END IF;

  FOREACH _p IN ARRAY _params LOOP
    -- Most recent non-null value for this marker, within window.
    -- Prefer provenance.normalized_value when present.
    EXECUTE format(
      'SELECT v, unv FROM (
         SELECT
           COALESCE(prov.normalized_value, lr.%I) AS v,
           (prov.id IS NULL OR prov.unit_source = ''unknown'') AS unv,
           lr.recorded_at
         FROM public.lab_results lr
         LEFT JOIN public.lab_value_provenance prov
           ON prov.lab_result_id = lr.id
          AND prov.field_key = %L
         WHERE lr.patient_id = $1
           AND lr.deleted_at IS NULL
           AND lr.recorded_at >= (now() - ($2 || '' days'')::interval)
           AND lr.%I IS NOT NULL
         ORDER BY lr.recorded_at DESC
         LIMIT 1
       ) s', _p, _p, _p)
    INTO _val, _is_unverified
    USING _patient_id, _window_days;

    IF _val IS NULL THEN
      _missing := array_append(_missing, _p);
    ELSE
      _result := _result || jsonb_build_object(_p, _val);
      IF COALESCE(_is_unverified, true) AND _p IN ('creatinine','total_bilirubin','direct_bilirubin','urea','hb') THEN
        _unverified := array_append(_unverified, _p);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'values', _result,
    'data_missing', to_jsonb(_missing),
    'unit_unverified', to_jsonb(_unverified),
    'window_days', _window_days,
    'incomplete', (array_length(_missing, 1) IS NOT NULL)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.coalesce_recent_lab_values(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coalesce_recent_lab_values(uuid, integer) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- calculate_risk_score_sql: rewritten to use coalesced 14-day values.
-- - No more magnitude-based unit conversion (uses provenance via helper)
-- - Missing markers are reported, never imputed as healthy
-- - eGFR missing no longer counts as 999 (healthy)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_risk_score_sql(_organ_type text, _patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  _score integer := 0;
  _level text;
  _patient RECORD;
  _days_since_tx integer;
  _best_creatinine numeric;
  _coalesced jsonb;
  _v jsonb;
  _data_missing jsonb;
  _unit_unverified jsonb;
  _cr numeric; _egfr numeric; _potassium numeric; _proteinuria numeric;
  _urea numeric; _phosphorus numeric; _magnesium numeric; _calcium numeric;
  _alt numeric; _ast numeric; _bili numeric; _dbili numeric; _ggt numeric;
  _alp numeric; _inr numeric; _albumin numeric; _platelets numeric;
  _tac numeric; _hb numeric; _crp numeric;
  _bk numeric; _cmv numeric; _dsa numeric;
BEGIN
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

  _coalesced := public.coalesce_recent_lab_values(_patient_id, 14);
  _v := COALESCE(_coalesced -> 'values', '{}'::jsonb);
  _data_missing := COALESCE(_coalesced -> 'data_missing', '[]'::jsonb);
  _unit_unverified := COALESCE(_coalesced -> 'unit_unverified', '[]'::jsonb);

  -- If absolutely no labs in window, return low + incomplete flag (do not invent values)
  IF _v = '{}'::jsonb THEN
    RETURN jsonb_build_object(
      'score', 0, 'level', 'low', 'organ_type', _organ_type,
      'patient_id', _patient_id, 'incomplete', true,
      'data_missing', _data_missing,
      'algorithm_version', 'v5.0-coalesced-window',
      'details', 'No lab values within 14-day window'
    );
  END IF;

  -- Pull markers (NULL when missing — never imputed as healthy)
  _cr        := NULLIF((_v->>'creatinine')::numeric, 0);
  _egfr      := (_v->>'egfr')::numeric;
  _potassium := (_v->>'potassium')::numeric;
  _proteinuria := (_v->>'proteinuria')::numeric;
  _urea      := (_v->>'urea')::numeric;
  _phosphorus := (_v->>'phosphorus')::numeric;
  _magnesium := (_v->>'magnesium')::numeric;
  _calcium   := (_v->>'calcium')::numeric;
  _alt       := (_v->>'alt')::numeric;
  _ast       := (_v->>'ast')::numeric;
  _bili      := (_v->>'total_bilirubin')::numeric;
  _dbili     := (_v->>'direct_bilirubin')::numeric;
  _ggt       := (_v->>'ggt')::numeric;
  _alp       := (_v->>'alp')::numeric;
  _inr       := (_v->>'inr')::numeric;
  _albumin   := (_v->>'albumin')::numeric;
  _platelets := (_v->>'platelets')::numeric;
  _tac       := (_v->>'tacrolimus_level')::numeric;
  _hb        := (_v->>'hb')::numeric;
  _crp       := (_v->>'crp')::numeric;
  _bk        := (_v->>'bk_virus_load')::numeric;
  _cmv       := (_v->>'cmv_load')::numeric;
  _dsa       := (_v->>'dsa_mfi')::numeric;

  IF _patient.transplant_date IS NOT NULL THEN
    _days_since_tx := (CURRENT_DATE - _patient.transplant_date);
    IF _days_since_tx < 0 THEN _days_since_tx := NULL; END IF;
  END IF;

  -- Blood-type mismatch
  IF _patient.blood_type IS NOT NULL AND _patient.donor_blood_type IS NOT NULL
     AND _patient.blood_type <> _patient.donor_blood_type THEN
    IF COALESCE(_patient.titer_therapy, false) THEN _score := _score + 10;
    ELSE _score := _score + 25; END IF;
  END IF;

  IF _days_since_tx IS NOT NULL AND _days_since_tx < 90 THEN _score := _score + 10; END IF;
  IF COALESCE(_patient.transplant_number, 1) >= 2 THEN _score := _score + 15; END IF;

  -- Shared markers — only score when value is present
  IF _hb IS NOT NULL THEN
    IF _hb < 7 THEN _score := _score + CASE WHEN _organ_type = 'kidney' THEN 20 ELSE 15 END;
    ELSIF _hb < 10 THEN _score := _score + CASE WHEN _organ_type = 'kidney' THEN 10 ELSE 5 END;
    END IF;
  END IF;

  IF _crp IS NOT NULL THEN
    IF _crp > 50 THEN _score := _score + 15;
    ELSIF _crp > 10 THEN _score := _score + 5; END IF;
  END IF;

  IF _calcium IS NOT NULL THEN
    IF _calcium > 2.75 THEN
      _score := _score + CASE WHEN _organ_type = 'kidney' THEN 15 ELSE 10 END;
    ELSIF _calcium < 2.0 THEN
      _score := _score + CASE WHEN _organ_type = 'kidney' THEN 8 ELSE 5 END;
    END IF;
  END IF;

  IF _organ_type = 'liver' THEN
    IF _alt IS NOT NULL THEN
      IF _alt > 800 THEN _score := _score + 40;
      ELSIF _alt > 500 THEN _score := _score + 30;
      ELSIF _alt > 120 THEN _score := _score + 25;
      ELSIF _alt > 60 THEN _score := _score + 10; END IF;
    END IF;
    IF _ast IS NOT NULL THEN
      IF _ast > 500 THEN _score := _score + 25;
      ELSIF _ast > 120 THEN _score := _score + 20;
      ELSIF _ast > 60 THEN _score := _score + 8; END IF;
    END IF;
    IF _bili IS NOT NULL THEN
      IF _bili > 10.0 THEN _score := _score + 30;
      ELSIF _bili > 3.0 THEN _score := _score + 20;
      ELSIF _bili > 1.5 THEN _score := _score + 10; END IF;
    END IF;
    IF _dbili IS NOT NULL THEN
      IF _dbili > 1.5 THEN _score := _score + 10;
      ELSIF _dbili > 0.5 THEN _score := _score + 5; END IF;
    END IF;
    IF _ggt IS NOT NULL THEN
      IF _ggt > 500 THEN _score := _score + 20;
      ELSIF _ggt > 200 THEN _score := _score + 15;
      ELSIF _ggt > 60 THEN _score := _score + 8; END IF;
    END IF;
    IF _alp IS NOT NULL THEN
      IF _alp > 300 THEN _score := _score + 15;
      ELSIF _alp > 120 THEN _score := _score + 8; END IF;
    END IF;
    IF _inr IS NOT NULL THEN
      IF _inr > 2.0 THEN _score := _score + 20;
      ELSIF _inr > 1.5 THEN _score := _score + 10; END IF;
    END IF;
    IF _platelets IS NOT NULL THEN
      IF _platelets < 50 THEN _score := _score + 15;
      ELSIF _platelets < 100 THEN _score := _score + 5; END IF;
    END IF;
    IF _albumin IS NOT NULL THEN
      IF _albumin < 2.5 THEN _score := _score + 20;
      ELSIF _albumin < 3.0 THEN _score := _score + 10; END IF;
    END IF;
    IF _tac IS NOT NULL AND _tac > 0 THEN
      IF COALESCE(_days_since_tx, 999) <= 30 THEN
        IF _tac < 8 THEN _score := _score + 25;
        ELSIF _tac > 10 THEN _score := _score + 15; END IF;
      ELSIF COALESCE(_days_since_tx, 999) <= 180 THEN
        IF _tac < 6 THEN _score := _score + 20;
        ELSIF _tac > 8 THEN _score := _score + 20; END IF;
      ELSE
        IF _tac < 4 THEN _score := _score + 25;
        ELSIF _tac > 7 THEN _score := _score + 25; END IF;
      END IF;
    ELSE
      -- Missing tacrolimus is itself a risk signal
      _score := _score + 12;
    END IF;
  ELSE
    -- KIDNEY
    IF _cr IS NOT NULL THEN
      IF _cr > 4.0 THEN _score := _score + 35;
      ELSIF _cr > 2.5 THEN _score := _score + 30;
      ELSIF _cr > 1.5 THEN _score := _score + 12; END IF;

      -- Baseline-relative creatinine within 90-day baseline window
      SELECT MIN(COALESCE(prov.normalized_value, lr.creatinine))
        INTO _best_creatinine
        FROM public.lab_results lr
        LEFT JOIN public.lab_value_provenance prov
          ON prov.lab_result_id = lr.id AND prov.field_key = 'creatinine'
        WHERE lr.patient_id = _patient_id
          AND lr.deleted_at IS NULL
          AND lr.creatinine IS NOT NULL
          AND lr.creatinine > 0
          AND lr.recorded_at >= (now() - interval '180 days');

      IF _best_creatinine IS NOT NULL AND _best_creatinine > 0 AND _cr > _best_creatinine * 1.25 THEN
        _score := _score + 35;
      END IF;
    END IF;
    -- eGFR: ONLY score when present. Missing eGFR no longer treated as 999.
    IF _egfr IS NOT NULL THEN
      IF _egfr < 15 THEN _score := _score + 30;
      ELSIF _egfr < 30 THEN _score := _score + 25;
      ELSIF _egfr < 45 THEN _score := _score + 12; END IF;
    END IF;
    IF _proteinuria IS NOT NULL THEN
      IF _proteinuria > 3.0 THEN _score := _score + 20;
      ELSIF _proteinuria > 1.0 THEN _score := _score + 15;
      ELSIF _proteinuria > 0.3 THEN _score := _score + 8; END IF;
    END IF;
    IF _potassium IS NOT NULL THEN
      IF _potassium > 6.0 THEN _score := _score + 15;
      ELSIF _potassium > 5.5 THEN _score := _score + 8;
      ELSIF _potassium > 0 AND _potassium < 3.5 THEN _score := _score + 8; END IF;
    END IF;
    IF _urea IS NOT NULL THEN
      IF _urea > 40 THEN _score := _score + 15;
      ELSIF _urea > 20 THEN _score := _score + 5; END IF;
    END IF;
    IF _phosphorus IS NOT NULL THEN
      IF _phosphorus > 1.78 THEN _score := _score + 15;
      ELSIF _phosphorus > 1.45 THEN _score := _score + 8; END IF;
    END IF;
    IF _magnesium IS NOT NULL THEN
      IF _magnesium > 0 AND _magnesium < 0.4 THEN _score := _score + 12;
      ELSIF _magnesium > 0 AND _magnesium < 0.6 THEN _score := _score + 5; END IF;
    END IF;
    IF _tac IS NOT NULL AND _tac > 0 THEN
      IF COALESCE(_days_since_tx, 999) <= 90 THEN
        IF _tac < 8 THEN _score := _score + 20;
        ELSIF _tac > 12 THEN _score := _score + 15; END IF;
      ELSIF COALESCE(_days_since_tx, 999) <= 365 THEN
        IF _tac < 6 THEN _score := _score + 20;
        ELSIF _tac > 8 THEN _score := _score + 20; END IF;
      ELSE
        IF _tac < 4 THEN _score := _score + 25;
        ELSIF _tac > 6 THEN _score := _score + 25; END IF;
      END IF;
    ELSE
      _score := _score + 15;
    END IF;
    IF _bk IS NOT NULL THEN
      IF _bk > 10000 THEN _score := _score + 20;
      ELSIF _bk > 1000 THEN _score := _score + 10; END IF;
    END IF;
    IF _cmv IS NOT NULL THEN
      IF _cmv > 1000 THEN _score := _score + 15;
      ELSIF _cmv > 500 THEN _score := _score + 8; END IF;
    END IF;
    IF _dsa IS NOT NULL THEN
      IF _dsa > 5000 THEN _score := _score + 20;
      ELSIF _dsa > 1000 THEN _score := _score + 10; END IF;
    END IF;
    IF COALESCE(_patient.dialysis_history, false) THEN _score := _score + 20; END IF;
  END IF;

  _score := LEAST(_score, 100);
  IF _score >= 60 THEN _level := 'high';
  ELSIF _score >= 30 THEN _level := 'medium';
  ELSE _level := 'low'; END IF;

  RETURN jsonb_build_object(
    'score', _score,
    'level', _level,
    'organ_type', _organ_type,
    'patient_id', _patient_id,
    'days_since_tx', _days_since_tx,
    'algorithm_version', 'v5.0-coalesced-window',
    'window_days', 14,
    'incomplete', (_coalesced->>'incomplete')::boolean,
    'data_missing', _data_missing,
    'unit_unverified', _unit_unverified
  );
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- check_lab_abnormal_and_alert: add 24-hour dedup so repeated imports /
-- OCR retries / recalculations cannot spawn duplicate active alerts.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_lab_abnormal_and_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    -- Missing values stay UNKNOWN — never NORMAL.
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

    -- DEDUP: skip if an identical active alert already exists in the last 24h
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
