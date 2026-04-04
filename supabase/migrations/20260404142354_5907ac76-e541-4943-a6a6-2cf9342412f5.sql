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
  _country text;
  _cr numeric;
  _bili numeric;
  _dbili numeric;
  _urea numeric;
  _hb numeric;
BEGIN
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

  -- ── Country-aware normalization ──
  _cr := COALESCE(_lab.creatinine, 0);
  IF _country = 'uzbekistan' AND _cr > 10 THEN
    _cr := ROUND(_cr / 88.4, 2);
  END IF;

  _bili := COALESCE(_lab.total_bilirubin, 0);
  IF _country = 'uzbekistan' AND _bili > 3 THEN
    _bili := ROUND(_bili / 17.1, 2);
  END IF;

  _dbili := COALESCE(_lab.direct_bilirubin, 0);
  IF _country = 'uzbekistan' AND _dbili > 1 THEN
    _dbili := ROUND(_dbili / 17.1, 2);
  END IF;

  _urea := COALESCE(_lab.urea, 0);
  IF _country = 'uzbekistan' AND _urea > 0 AND _urea < 15 THEN
    _urea := ROUND(_urea * 6, 2);
  END IF;

  _hb := COALESCE(_lab.hb, 0);
  IF _country = 'uzbekistan' AND _hb > 30 THEN
    _hb := ROUND(_hb / 10, 2);
  END IF;

  -- Days since transplant
  IF _patient.transplant_date IS NOT NULL THEN
    _days_since_tx := (CURRENT_DATE - _patient.transplant_date);
    IF _days_since_tx < 0 THEN _days_since_tx := NULL; END IF;
  END IF;

  -- ══ SHARED: Blood type mismatch ══
  IF _patient.blood_type IS NOT NULL
     AND _patient.donor_blood_type IS NOT NULL
     AND _patient.blood_type <> _patient.donor_blood_type THEN
    IF COALESCE(_patient.titer_therapy, false) THEN _score := _score + 10;
    ELSE _score := _score + 25;
    END IF;
  END IF;

  -- ══ SHARED: Early post-transplant (<90 days) ══
  IF _days_since_tx IS NOT NULL AND _days_since_tx < 90 THEN
    _score := _score + 10;
  END IF;

  -- ══ SHARED: Re-transplant ══
  IF COALESCE(_patient.transplant_number, 1) >= 2 THEN
    _score := _score + 15;
  END IF;

  -- ══ SHARED: Hemoglobin (g/dL — normalized) ══
  IF _hb > 0 THEN
    IF _hb < 7 THEN
      _score := _score + CASE WHEN _organ_type = 'kidney' THEN 20 ELSE 15 END;
    ELSIF _hb < 10 THEN
      _score := _score + CASE WHEN _organ_type = 'kidney' THEN 10 ELSE 5 END;
    END IF;
  END IF;

  -- ══ SHARED: CRP (mg/L — universal) ══
  IF COALESCE(_lab.crp, 0) > 50 THEN _score := _score + 15;
  ELSIF COALESCE(_lab.crp, 0) > 10 THEN _score := _score + 5;
  END IF;

  -- ══ SHARED: Calcium (mmol/L — universal) ══
  IF COALESCE(_lab.calcium, 0) > 2.75 THEN
    _score := _score + CASE WHEN _organ_type = 'kidney' THEN 15 ELSE 10 END;
  ELSIF COALESCE(_lab.calcium, 0) > 0 AND _lab.calcium < 2.0 THEN
    _score := _score + CASE WHEN _organ_type = 'kidney' THEN 8 ELSE 5 END;
  END IF;

  IF _organ_type = 'liver' THEN
    -- ALT (U/L)
    IF COALESCE(_lab.alt, 0) > 800 THEN _score := _score + 40;
    ELSIF COALESCE(_lab.alt, 0) > 500 THEN _score := _score + 30;
    ELSIF COALESCE(_lab.alt, 0) > 120 THEN _score := _score + 25;
    ELSIF COALESCE(_lab.alt, 0) > 60 THEN _score := _score + 10;
    END IF;

    -- AST (U/L)
    IF COALESCE(_lab.ast, 0) > 500 THEN _score := _score + 25;
    ELSIF COALESCE(_lab.ast, 0) > 120 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.ast, 0) > 60 THEN _score := _score + 8;
    END IF;

    -- Total Bilirubin (normalized mg/dL)
    IF _bili > 10.0 THEN _score := _score + 30;
    ELSIF _bili > 3.0 THEN _score := _score + 20;
    ELSIF _bili > 1.5 THEN _score := _score + 10;
    END IF;

    -- Direct Bilirubin (normalized mg/dL)
    IF _dbili > 1.5 THEN _score := _score + 10;
    ELSIF _dbili > 0.5 THEN _score := _score + 5;
    END IF;

    -- GGT (U/L)
    IF COALESCE(_lab.ggt, 0) > 500 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.ggt, 0) > 200 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.ggt, 0) > 60 THEN _score := _score + 8;
    END IF;

    -- ALP (U/L)
    IF COALESCE(_lab.alp, 0) > 300 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.alp, 0) > 120 THEN _score := _score + 8;
    END IF;

    -- INR — AASLD 2023 (coagulopathy)
    IF COALESCE(_lab.inr, 0) > 2.0 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.inr, 0) > 1.5 THEN _score := _score + 10;
    END IF;

    -- Platelets (x10³/µL) — AASLD 2023 (thrombocytopenia)
    IF COALESCE(_lab.platelets, 0) > 0 AND _lab.platelets < 50 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.platelets, 0) > 0 AND _lab.platelets < 100 THEN _score := _score + 5;
    END IF;

    -- Albumin (g/dL) — AASLD 2023 (synthetic function)
    IF COALESCE(_lab.albumin, 0) > 0 AND _lab.albumin < 2.5 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.albumin, 0) > 0 AND _lab.albumin < 3.0 THEN _score := _score + 10;
    END IF;

    -- Tacrolimus — AASLD time-dependent
    IF COALESCE(_lab.tacrolimus_level, 0) > 0 THEN
      IF COALESCE(_days_since_tx, 999) <= 30 THEN
        IF _lab.tacrolimus_level < 8 THEN _score := _score + 25;
        ELSIF _lab.tacrolimus_level > 10 THEN _score := _score + 15;
        END IF;
      ELSIF COALESCE(_days_since_tx, 999) <= 180 THEN
        IF _lab.tacrolimus_level < 6 THEN _score := _score + 20;
        ELSIF _lab.tacrolimus_level > 8 THEN _score := _score + 20;
        END IF;
      ELSE
        IF _lab.tacrolimus_level < 4 THEN _score := _score + 25;
        ELSIF _lab.tacrolimus_level > 7 THEN _score := _score + 25;
        END IF;
      END IF;
    END IF;

  ELSE -- kidney
    -- Creatinine (normalized mg/dL)
    IF _cr > 4.0 THEN _score := _score + 35;
    ELSIF _cr > 2.5 THEN _score := _score + 30;
    ELSIF _cr > 1.5 THEN _score := _score + 12;
    END IF;

    -- Baseline-relative creatinine (KDIGO 2009)
    SELECT MIN(
      CASE
        WHEN _country = 'uzbekistan' AND creatinine > 10 THEN ROUND(creatinine / 88.4, 2)
        ELSE creatinine
      END
    ) INTO _best_creatinine
    FROM public.lab_results
    WHERE patient_id = _patient_id AND creatinine IS NOT NULL AND creatinine > 0;

    IF _best_creatinine IS NOT NULL AND _best_creatinine > 0
       AND _cr > 0 AND _cr > _best_creatinine * 1.25 THEN
      _score := _score + 35;
    END IF;

    -- eGFR (mL/min/1.73m²)
    IF COALESCE(_lab.egfr, 999) < 15 THEN _score := _score + 30;
    ELSIF COALESCE(_lab.egfr, 999) < 30 THEN _score := _score + 25;
    ELSIF COALESCE(_lab.egfr, 999) < 45 THEN _score := _score + 12;
    END IF;

    -- Proteinuria (g/day)
    IF COALESCE(_lab.proteinuria, 0) > 3.0 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.proteinuria, 0) > 1.0 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.proteinuria, 0) > 0.3 THEN _score := _score + 8;
    END IF;

    -- Potassium (mmol/L)
    IF COALESCE(_lab.potassium, 0) > 6.0 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.potassium, 0) > 5.5 THEN _score := _score + 8;
    ELSIF COALESCE(_lab.potassium, 0) > 0 AND _lab.potassium < 3.5 THEN _score := _score + 8;
    END IF;

    -- Urea (normalized mg/dL) — KDIGO 2024
    IF _urea > 40 THEN _score := _score + 15;
    ELSIF _urea > 20 THEN _score := _score + 5;
    END IF;

    -- Phosphorus (mmol/L) — KDIGO CKD-MBD 2024
    IF COALESCE(_lab.phosphorus, 0) > 1.78 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.phosphorus, 0) > 1.45 THEN _score := _score + 8;
    END IF;

    -- Magnesium (mmol/L) — KDIGO CKD-MBD 2024
    IF COALESCE(_lab.magnesium, 0) > 0 AND _lab.magnesium < 0.4 THEN _score := _score + 12;
    ELSIF COALESCE(_lab.magnesium, 0) > 0 AND _lab.magnesium < 0.6 THEN _score := _score + 5;
    END IF;

    -- Tacrolimus — KDIGO time-dependent
    IF COALESCE(_lab.tacrolimus_level, 0) > 0 THEN
      IF COALESCE(_days_since_tx, 999) <= 90 THEN
        IF _lab.tacrolimus_level < 8 THEN _score := _score + 20;
        ELSIF _lab.tacrolimus_level > 12 THEN _score := _score + 15;
        END IF;
      ELSIF COALESCE(_days_since_tx, 999) <= 365 THEN
        IF _lab.tacrolimus_level < 6 THEN _score := _score + 20;
        ELSIF _lab.tacrolimus_level > 8 THEN _score := _score + 20;
        END IF;
      ELSE
        IF _lab.tacrolimus_level < 4 THEN _score := _score + 25;
        ELSIF _lab.tacrolimus_level > 6 THEN _score := _score + 25;
        END IF;
      END IF;
    END IF;

    -- BK Virus (copies/ml)
    IF COALESCE(_lab.bk_virus_load, 0) > 10000 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.bk_virus_load, 0) > 1000 THEN _score := _score + 10;
    END IF;

    -- CMV (copies/ml)
    IF COALESCE(_lab.cmv_load, 0) > 1000 THEN _score := _score + 15;
    ELSIF COALESCE(_lab.cmv_load, 0) > 500 THEN _score := _score + 8;
    END IF;

    -- DSA MFI
    IF COALESCE(_lab.dsa_mfi, 0) > 5000 THEN _score := _score + 20;
    ELSIF COALESCE(_lab.dsa_mfi, 0) > 1000 THEN _score := _score + 10;
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
    'country', _country,
    'days_since_tx', _days_since_tx,
    'algorithm_version', 'v4.0-full-kdigo-aasld'
  );
END;
$function$;