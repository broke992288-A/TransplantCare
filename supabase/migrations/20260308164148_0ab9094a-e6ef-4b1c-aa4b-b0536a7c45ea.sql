
-- Automated medical alert trigger on lab_results insert/update
CREATE OR REPLACE FUNCTION public.check_lab_abnormal_and_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _organ_type text;
  _flags text[] := '{}';
  _severity text := 'warning';
BEGIN
  -- Get patient organ type
  SELECT organ_type INTO _organ_type FROM public.patients WHERE id = NEW.patient_id;
  IF _organ_type IS NULL THEN RETURN NEW; END IF;

  IF _organ_type = 'kidney' THEN
    -- Creatinine > 2.0 mg/dL
    IF NEW.creatinine IS NOT NULL AND NEW.creatinine > 2.0 THEN
      _flags := array_append(_flags, 'Creatinine: ' || NEW.creatinine || ' mg/dL (norma < 1.2)');
      IF NEW.creatinine > 4.0 THEN _severity := 'critical'; END IF;
    END IF;
    -- eGFR < 30
    IF NEW.egfr IS NOT NULL AND NEW.egfr < 30 THEN
      _flags := array_append(_flags, 'eGFR: ' || NEW.egfr || ' (norma > 60)');
      IF NEW.egfr < 15 THEN _severity := 'critical'; END IF;
    END IF;
    -- Potassium > 5.5 or < 3.0
    IF NEW.potassium IS NOT NULL AND (NEW.potassium > 5.5 OR NEW.potassium < 3.0) THEN
      _flags := array_append(_flags, 'Kaliy: ' || NEW.potassium || ' mmol/L (norma 3.5-5.0)');
      IF NEW.potassium > 6.5 OR NEW.potassium < 2.5 THEN _severity := 'critical'; END IF;
    END IF;
    -- Proteinuria > 1.0
    IF NEW.proteinuria IS NOT NULL AND NEW.proteinuria > 1.0 THEN
      _flags := array_append(_flags, 'Proteinuriya: ' || NEW.proteinuria || ' g/day (norma < 0.15)');
    END IF;
  ELSIF _organ_type = 'liver' THEN
    -- Tacrolimus < 4 or > 20
    IF NEW.tacrolimus_level IS NOT NULL AND (NEW.tacrolimus_level < 4 OR NEW.tacrolimus_level > 20) THEN
      _flags := array_append(_flags, 'Tacrolimus: ' || NEW.tacrolimus_level || ' ng/mL (norma 5-15)');
      IF NEW.tacrolimus_level > 25 OR NEW.tacrolimus_level < 2 THEN _severity := 'critical'; END IF;
    END IF;
    -- ALT > 80
    IF NEW.alt IS NOT NULL AND NEW.alt > 80 THEN
      _flags := array_append(_flags, 'ALT: ' || NEW.alt || ' U/L (norma < 40)');
      IF NEW.alt > 200 THEN _severity := 'critical'; END IF;
    END IF;
    -- AST > 80
    IF NEW.ast IS NOT NULL AND NEW.ast > 80 THEN
      _flags := array_append(_flags, 'AST: ' || NEW.ast || ' U/L (norma < 40)');
      IF NEW.ast > 200 THEN _severity := 'critical'; END IF;
    END IF;
    -- Total Bilirubin > 2.0
    IF NEW.total_bilirubin IS NOT NULL AND NEW.total_bilirubin > 2.0 THEN
      _flags := array_append(_flags, 'Bilirubin: ' || NEW.total_bilirubin || ' mg/dL (norma < 1.2)');
      IF NEW.total_bilirubin > 5.0 THEN _severity := 'critical'; END IF;
    END IF;
  END IF;

  -- If any abnormal flags detected, create an alert
  IF array_length(_flags, 1) > 0 THEN
    INSERT INTO public.patient_alerts (patient_id, alert_type, severity, title, message)
    VALUES (
      NEW.patient_id,
      'lab_abnormal',
      _severity,
      CASE WHEN _severity = 'critical'
           THEN 'Jiddiy og''shish aniqlandi!'
           ELSE 'Laboratoriya natijasi norma chegarasidan tashqarida'
      END,
      array_to_string(_flags, '; ')
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_check_lab_abnormal
  AFTER INSERT OR UPDATE ON public.lab_results
  FOR EACH ROW
  EXECUTE FUNCTION public.check_lab_abnormal_and_alert();
