CREATE OR REPLACE FUNCTION public.calculate_risk_score_sql(_organ_type text, _patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
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
  _critical_triggers jsonb := '[]'::jsonb;
  _override_applied boolean := false;
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

  IF _v = '{}'::jsonb THEN
    RETURN jsonb_build_object(
      'score', 0, 'level', 'low', 'organ_type', _organ_type,
      'patient_id', _patient_id, 'incomplete', true,
      'data_missing', _data_missing,
      'algorithm_version', 'v5.1-single-marker-override',
      'details', 'No lab values within 14-day window'
    );
  END IF;

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

  IF _patient.blood_type IS NOT NULL AND _patient.donor_blood_type IS NOT NULL
     AND _patient.blood_type <> _patient.donor_blood_type THEN
    IF COALESCE(_patient.titer_therapy, false) THEN _score := _score + 10;
    ELSE _score := _score + 25; END IF;
  END IF;

  IF _days_since_tx IS NOT NULL AND _days_since_tx < 90 THEN _score := _score + 10; END IF;
  IF COALESCE(_patient.transplant_number, 1) >= 2 THEN _score := _score + 15; END IF;

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
      _score := _score + 12;
    END IF;
  ELSE
    IF _cr IS NOT NULL THEN
      IF _cr > 4.0 THEN _score := _score + 35;
      ELSIF _cr > 2.5 THEN _score := _score + 30;
      ELSIF _cr > 1.5 THEN _score := _score + 12; END IF;

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

  -- ─── SINGLE-MARKER CRITICAL OVERRIDE (v5.1) ───
  -- Any one of these markers, regardless of total score, forces HIGH risk
  -- with a floor of 65. Never lowers an already-high score.
  IF _cr IS NOT NULL AND _cr > 3.0 THEN
    _critical_triggers := _critical_triggers || jsonb_build_object(
      'marker', 'creatinine', 'value', _cr, 'threshold', '>3.0 mg/dL',
      'message', 'Critical creatinine elevation'
    );
  END IF;
  IF _tac IS NOT NULL AND _tac > 0 AND _tac < 3.0 THEN
    _critical_triggers := _critical_triggers || jsonb_build_object(
      'marker', 'tacrolimus_level', 'value', _tac, 'threshold', '<3.0 ng/mL',
      'message', 'Subtherapeutic tacrolimus — rejection risk'
    );
  END IF;
  IF _tac IS NOT NULL AND _tac > 15.0 THEN
    _critical_triggers := _critical_triggers || jsonb_build_object(
      'marker', 'tacrolimus_level', 'value', _tac, 'threshold', '>15.0 ng/mL',
      'message', 'Toxic tacrolimus level'
    );
  END IF;
  IF _potassium IS NOT NULL AND _potassium > 6.0 THEN
    _critical_triggers := _critical_triggers || jsonb_build_object(
      'marker', 'potassium', 'value', _potassium, 'threshold', '>6.0 mmol/L',
      'message', 'Severe hyperkalemia'
    );
  END IF;
  IF _organ_type = 'liver' THEN
    IF _alt IS NOT NULL AND _alt > 200 THEN
      _critical_triggers := _critical_triggers || jsonb_build_object(
        'marker', 'alt', 'value', _alt, 'threshold', '>200 U/L',
        'message', 'Critical ALT elevation'
      );
    END IF;
    IF _ast IS NOT NULL AND _ast > 200 THEN
      _critical_triggers := _critical_triggers || jsonb_build_object(
        'marker', 'ast', 'value', _ast, 'threshold', '>200 U/L',
        'message', 'Critical AST elevation'
      );
    END IF;
    IF _bili IS NOT NULL AND _bili > 5.0 THEN
      _critical_triggers := _critical_triggers || jsonb_build_object(
        'marker', 'total_bilirubin', 'value', _bili, 'threshold', '>5.0 mg/dL',
        'message', 'Critical hyperbilirubinemia'
      );
    END IF;
  END IF;
  IF _organ_type = 'kidney' AND _egfr IS NOT NULL AND _egfr < 20 THEN
    _critical_triggers := _critical_triggers || jsonb_build_object(
      'marker', 'egfr', 'value', _egfr, 'threshold', '<20',
      'message', 'Critical kidney function decline'
    );
  END IF;

  IF jsonb_array_length(_critical_triggers) > 0 THEN
    _override_applied := true;
    _score := GREATEST(_score, 65);
    _level := 'high';
  END IF;

  RETURN jsonb_build_object(
    'score', _score,
    'level', _level,
    'organ_type', _organ_type,
    'patient_id', _patient_id,
    'days_since_tx', _days_since_tx,
    'algorithm_version', 'v5.1-single-marker-override',
    'window_days', 14,
    'incomplete', (_coalesced->>'incomplete')::boolean,
    'data_missing', _data_missing,
    'unit_unverified', _unit_unverified,
    'single_marker_critical_override', _override_applied,
    'critical_triggers', _critical_triggers
  );
END;
$function$;