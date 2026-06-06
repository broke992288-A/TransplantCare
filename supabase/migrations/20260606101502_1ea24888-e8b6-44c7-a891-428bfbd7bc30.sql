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
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _action NOT IN (
    'user_login','patient_login','lab_upload','lab_result_edit',
    'doctor_view_patient','patient_logout','password_reset',
    'patient_identity_override','ocr_unknown_unit_confirmed'
  ) THEN
    RAISE EXCEPTION 'Invalid audit action: %', _action;
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$function$;