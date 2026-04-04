
CREATE OR REPLACE FUNCTION public.calculate_risk_score_sql(_organ_type text, _patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _score integer := 0;
  _level text;
  _lab RECORD;
  _patient RECORD;
  _days_since_tx integer;
  _best_creatinine numeric;
BEGIN
  SELECT * INTO _patient FROM public.patients WHERE id = _patient_id;
  IF _patient IS NULL THEN
    RETURN jsonb_build_object('error', 'Patient not found');
  END IF;

  SELECT * INTO _lab FROM public.lab_results
    WHERE patient_id = _patient_id
    ORDER BY recorded_at DESC LIMIT 1;

  IF _lab IS NULL THEN
    RETURN jsonb_build_object('score', 0, 'level', 'low', 'details', 'No lab data');
  END IF;

  -- Days since transplant
  IF _patient.transplant_date IS NOT NULL THEN
    _days_since_tx := (CURRENT_DATE - _patient.transplant_date);
    IF _days_since_tx < 0 THEN _days_since_tx := NULL; END IF;
  END IF;

  -- Blood type mismatch
  IF _patient.blood_type IS NOT NULL
     AND _patient.donor_blood_type IS NOT NULL
     AND _patient.blood_type <> _patient.donor_blood_type THEN
    IF COALESCE(_patient.titer_therapy, false) THEN
      _score := _score + 10;
    ELSE
      _score := _score + 25;
    END IF;
  END IF;

  -- Early post-transplant (<90 days)
  IF _days_since_tx IS NOT NULL AND _days_since_tx < 90 THEN
    _score := _score + 10;
  END IF;

  -- Re-transplant
  IF COALESCE(_patient.transplant_number, 1) >= 2 THEN
    _score := _score + 15;
  END IF;

  IF _organ_type = 'liver' THEN
    -- ALT
    IF COALESCE(_lab.alt, 0) > 800 THEN _score := _score + 40;
    ELSIF COALESCE(_lab.alt, 0) > 500 THEN _score := _score + 30;
    ELSIF COALESCE(_lab.alt, 0) > 120 THEN _score := _score + 25;
    ELSIF COALESCE(_lab.alt, 0) > 60 THEN _score := _score + 10;
    END IF;

    -- AST
    IF COALESCE(_lab.ast, 0) > 500 THEN _score := _score + 25;
    ELSIF COALESCE(_lab.ast, 0) > 120 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.ast, 0) > 60 THEN _score := _score + 8;
    END IF;

    -- Total Bilirubin
    IF COALESCE(_lab.total_bilirubin, 0) > 10.0 THEN _score := _score + 30;
    ELSIF COALESCE(_lab.total_bilirubin, 0) > 3.0 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.total_bilirubin, 0) > 1.5 THEN _score := _score + 10;
    END IF;

    -- Direct Bilirubin
    IF COALESCE(_lab.direct_bilirubin, 0) > 1.5 THEN _score := _score + 10;
    ELSIF COALESCE(_lab.direct_bilirubin, 0) > 0.5 THEN _score := _score + 5;
    END IF;

    -- GGT
    IF COALESCE(_lab.ggt, 0) > 500 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.ggt, 0) > 200 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.ggt, 0) > 60 THEN _score := _score + 8;
    END IF;

    -- ALP
    IF COALESCE(_lab.alp, 0) > 300 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.alp, 0) > 120 THEN _score := _score + 8;
    END IF;

    -- Tacrolimus — AASLD 2021/2023 time-dependent windows
    IF COALESCE(_lab.tacrolimus_level, 0) > 0 THEN
      IF COALESCE(_days_since_tx, 999) <= 30 THEN
        -- 0-30 days: Target [8-10]
        IF _lab.tacrolimus_level < 8 THEN _score := _score + 25;
        ELSIF _lab.tacrolimus_level > 10 THEN _score := _score + 15;
        END IF;
      ELSIF COALESCE(_days_since_tx, 999) <= 180 THEN
        -- 30-180 days: Target [6-8]
        IF _lab.tacrolimus_level < 6 THEN _score := _score + 20;
        ELSIF _lab.tacrolimus_level > 8 THEN _score := _score + 20;
        END IF;
      ELSE
        -- >180 days: Target [4-7]
        IF _lab.tacrolimus_level < 4 THEN _score := _score + 25;
        ELSIF _lab.tacrolimus_level > 7 THEN _score := _score + 25;
        END IF;
      END IF;
    END IF;

  ELSE -- kidney
    -- Creatinine
    IF COALESCE(_lab.creatinine, 0) > 4.0 THEN _score := _score + 35;
    ELSIF COALESCE(_lab.creatinine, 0) > 2.5 THEN _score := _score + 30;
    ELSIF COALESCE(_lab.creatinine, 0) > 1.5 THEN _score := _score + 12;
    END IF;

    -- Baseline-relative creatinine (KDIGO 2009): >25% above best → +35 pts
    SELECT MIN(creatinine) INTO _best_creatinine
    FROM public.lab_results
    WHERE patient_id = _patient_id
      AND creatinine IS NOT NULL
      AND creatinine > 0;

    IF _best_creatinine IS NOT NULL AND _best_creatinine > 0
       AND COALESCE(_lab.creatinine, 0) > 0
       AND _lab.creatinine > _best_creatinine * 1.25 THEN
      _score := _score + 35;
    END IF;

    -- eGFR
    IF COALESCE(_lab.egfr, 999) < 15 THEN _score := _score + 30;
    ELSIF COALESCE(_lab.egfr, 999) < 30 THEN _score := _score + 25;
    ELSIF COALESCE(_lab.egfr, 999) < 45 THEN _score := _score + 12;
    END IF;

    -- Proteinuria
    IF COALESCE(_lab.proteinuria, 0) > 3.0 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.proteinuria, 0) > 1.0 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.proteinuria, 0) > 0.3 THEN _score := _score + 8;
    END IF;

    -- Potassium
    IF COALESCE(_lab.potassium, 0) > 6.0 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.potassium, 0) > 5.5 THEN _score := _score + 8;
    ELSIF COALESCE(_lab.potassium, 0) > 0 AND _lab.potassium < 3.5 THEN _score := _score + 8;
    END IF;

    -- Tacrolimus — KDIGO 2009/2024 time-dependent windows
    IF COALESCE(_lab.tacrolimus_level, 0) > 0 THEN
      IF COALESCE(_days_since_tx, 999) <= 90 THEN
        -- 0-90 days: Target [8-12]
        IF _lab.tacrolimus_level < 8 THEN _score := _score + 20;
        ELSIF _lab.tacrolimus_level > 12 THEN _score := _score + 15;
        END IF;
      ELSIF COALESCE(_days_since_tx, 999) <= 365 THEN
        -- 90-365 days: Target [6-8]
        IF _lab.tacrolimus_level < 6 THEN _score := _score + 20;
        ELSIF _lab.tacrolimus_level > 8 THEN _score := _score + 20;
        END IF;
      ELSE
        -- >365 days: Target [4-6]
        IF _lab.tacrolimus_level < 4 THEN _score := _score + 25;
        ELSIF _lab.tacrolimus_level > 6 THEN _score := _score + 25;
        END IF;
      END IF;
    END IF;

    -- Dialysis history
    IF COALESCE(_patient.dialysis_history, false) THEN
      _score := _score + 20;
    END IF;
  END IF;

  _score := LEAST(_score, 100);

  IF _score >= 60 THEN _level := 'high';
  ELSIF _score >= 30 THEN _level := 'medium';
  ELSE _level := 'low';
  END IF;

  RETURN jsonb_build_object(
    'score', _score,
    'level', _level,
    'organ_type', _organ_type,
    'patient_id', _patient_id,
    'days_since_tx', _days_since_tx,
    'algorithm_version', 'v2.0-kdigo2024'
  );
END;
$function$;
