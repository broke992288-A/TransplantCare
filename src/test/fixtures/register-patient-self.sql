CREATE OR REPLACE FUNCTION public.register_patient_self(_full_name text, _phone text DEFAULT NULL::text, _date_of_birth date DEFAULT NULL::date, _gender text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _patient_id uuid;
  _normalized_phone text;
  _existing_role text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Serialize self-registration for the same account, not by phone number.
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text, 0));

  SELECT role::text INTO _existing_role
  FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  IF _existing_role IS NOT NULL AND _existing_role <> 'patient' THEN
    RAISE EXCEPTION 'Bu hisob allaqachon % roli bilan ro''yxatdan o''tgan. Bemor sifatida kirish uchun boshqa hisob yarating.', _existing_role;
  END IF;
  IF _existing_role IS NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'patient');
  END IF;

  -- Reuse only a record already linked to this authenticated account.
  SELECT id INTO _patient_id FROM public.patients WHERE linked_user_id = _user_id;
  IF _patient_id IS NOT NULL THEN
    RETURN _patient_id;
  END IF;

  -- A supplied phone number is contact information, never ownership proof.
  _normalized_phone := public.normalize_phone(_phone);
  INSERT INTO public.patients (full_name, phone, date_of_birth, gender, linked_user_id, organ_type, risk_level)
  VALUES (_full_name, _normalized_phone, _date_of_birth, _gender, _user_id, 'kidney', 'low')
  RETURNING id INTO _patient_id;
  RETURN _patient_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.register_patient_self(text, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_patient_self(text, text, date, text) TO authenticated, service_role;