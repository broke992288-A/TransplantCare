
-- Drop existing function and recreate with organ-aware logic
CREATE OR REPLACE FUNCTION public.generate_lab_schedule(_patient_id uuid, _transplant_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _organ_type text;
  _days_since integer;
  _interval_days integer;
  _next_date date;
  _count integer := 0;
BEGIN
  SELECT organ_type INTO _organ_type FROM public.patients WHERE id = _patient_id;
  _organ_type := COALESCE(_organ_type, 'kidney');

  -- Delete future uncompleted schedules to regenerate
  DELETE FROM public.lab_schedules
  WHERE patient_id = _patient_id
    AND completed_lab_id IS NULL
    AND scheduled_date >= CURRENT_DATE;

  _days_since := GREATEST(CURRENT_DATE - _transplant_date, 0);
  _next_date := CURRENT_DATE;

  -- Generate next 6 scheduled dates
  WHILE _count < 6 LOOP
    -- Determine interval based on organ type and days since transplant
    IF _organ_type = 'liver' THEN
      IF (_next_date - _transplant_date) <= 30 THEN
        _interval_days := 3;
      ELSIF (_next_date - _transplant_date) <= 180 THEN
        _interval_days := 7;
      ELSE
        _interval_days := 30;
      END IF;
    ELSE -- kidney
      IF (_next_date - _transplant_date) <= 90 THEN
        _interval_days := 7;
      ELSIF (_next_date - _transplant_date) <= 180 THEN
        _interval_days := 14;
      ELSE
        _interval_days := 30;
      END IF;
    END IF;

    _next_date := _next_date + _interval_days;
    
    INSERT INTO public.lab_schedules (patient_id, scheduled_date, status)
    VALUES (_patient_id, _next_date, 
      CASE WHEN _next_date < CURRENT_DATE THEN 'overdue'
           WHEN _next_date <= CURRENT_DATE + 3 THEN 'due_soon'
           ELSE 'upcoming' END
    )
    ON CONFLICT DO NOTHING;
    
    _count := _count + 1;
  END LOOP;
END;
$function$;

-- Create trigger to auto-generate schedules on patient insert or transplant_date change
CREATE OR REPLACE FUNCTION public.trg_generate_lab_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.transplant_date IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.transplant_date IS DISTINCT FROM NEW.transplant_date) THEN
    PERFORM public.generate_lab_schedule(NEW.id, NEW.transplant_date);
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_patient_lab_schedule ON public.patients;
CREATE TRIGGER trg_patient_lab_schedule
  AFTER INSERT OR UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_generate_lab_schedule();
