CREATE OR REPLACE FUNCTION public.validate_role_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Allow service role / database-level inserts (auth.uid() is null)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.role <> 'patient' THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only administrators can assign the % role', NEW.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;