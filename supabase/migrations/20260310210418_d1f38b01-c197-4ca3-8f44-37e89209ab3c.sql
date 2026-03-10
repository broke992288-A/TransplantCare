
-- Replace the hardcoded lab alert trigger with one that reads from clinical_thresholds table
CREATE OR REPLACE FUNCTION public.check_lab_abnormal_and_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _organ_type text;
  _flags text[] := '{}';
  _severity text := 'warning';
  _threshold RECORD;
  _value numeric;
  _param_map jsonb;
BEGIN
  -- Get patient organ type
  SELECT organ_type INTO _organ_type FROM public.patients WHERE id = NEW.patient_id;
  IF _organ_type IS NULL THEN RETURN NEW; END IF;

  -- Build a map of parameter name -> lab value
  _param_map := jsonb_build_object(
    'creatinine', NEW.creatinine,
    'egfr', NEW.egfr,
    'potassium', NEW.potassium,
    'proteinuria', NEW.proteinuria,
    'tacrolimus', NEW.tacrolimus_level,
    'alt', NEW.alt,
    'ast', NEW.ast,
    'total_bilirubin', NEW.total_bilirubin,
    'direct_bilirubin', NEW.direct_bilirubin,
    'hb', NEW.hb,
    'platelets', NEW.platelets,
    'inr', NEW.inr,
    'alp', NEW.alp,
    'ggt', NEW.ggt,
    'albumin', NEW.albumin,
    'crp', NEW.crp
  );

  -- Loop through thresholds for this organ type
  FOR _threshold IN
    SELECT * FROM public.clinical_thresholds WHERE organ_type = _organ_type
  LOOP
    _value := (_param_map ->> _threshold.parameter)::numeric;
    IF _value IS NULL THEN CONTINUE; END IF;

    -- Check critical thresholds (value above critical_min or below critical_max)
    IF (_threshold.critical_min IS NOT NULL AND _value >= _threshold.critical_min) THEN
      _flags := array_append(_flags, _threshold.parameter || ': ' || _value || ' ' || _threshold.unit ||
        ' (norma ' || COALESCE(_threshold.normal_min::text, '') || '-' || COALESCE(_threshold.normal_max::text, '') || ') [' || _threshold.guideline_source || ']');
      _severity := 'critical';
    ELSIF (_threshold.critical_max IS NOT NULL AND _value <= _threshold.critical_max) THEN
      _flags := array_append(_flags, _threshold.parameter || ': ' || _value || ' ' || _threshold.unit ||
        ' (norma ' || COALESCE(_threshold.normal_min::text, '') || '-' || COALESCE(_threshold.normal_max::text, '') || ') [' || _threshold.guideline_source || ']');
      _severity := 'critical';
    -- Check warning thresholds
    ELSIF (_threshold.warning_min IS NOT NULL AND _value >= _threshold.warning_min) THEN
      _flags := array_append(_flags, _threshold.parameter || ': ' || _value || ' ' || _threshold.unit ||
        ' (norma ' || COALESCE(_threshold.normal_min::text, '') || '-' || COALESCE(_threshold.normal_max::text, '') || ') [' || _threshold.guideline_source || ']');
    ELSIF (_threshold.warning_max IS NOT NULL AND _value <= _threshold.warning_max) THEN
      _flags := array_append(_flags, _threshold.parameter || ': ' || _value || ' ' || _threshold.unit ||
        ' (norma ' || COALESCE(_threshold.normal_min::text, '') || '-' || COALESCE(_threshold.normal_max::text, '') || ') [' || _threshold.guideline_source || ']');
    END IF;
  END LOOP;

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
$function$;
