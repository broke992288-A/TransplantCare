
CREATE OR REPLACE FUNCTION public.normalize_patient_phone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
SECURITY INVOKER
AS $$
BEGIN
  NEW.phone := public.normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$;
