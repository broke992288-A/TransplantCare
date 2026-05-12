
-- 1) Clean up: keep only highest-priority role per user
WITH ranked AS (
  SELECT id, user_id, role,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY CASE role::text
        WHEN 'admin' THEN 1
        WHEN 'doctor' THEN 2
        WHEN 'support' THEN 3
        WHEN 'patient' THEN 4
      END
    ) AS rn
  FROM public.user_roles
)
DELETE FROM public.user_roles
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Enforce one role per user going forward
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_per_user_idx
  ON public.user_roles (user_id);

-- 3) Update register_patient_self to refuse if user already has any other role
CREATE OR REPLACE FUNCTION public.register_patient_self(_full_name text, _phone text DEFAULT NULL::text, _date_of_birth date DEFAULT NULL::date, _gender text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _patient_id uuid;
  _normalized_phone text;
  _existing_role text;
BEGIN
  -- Check if user already has a role
  SELECT role::text INTO _existing_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF _existing_role IS NOT NULL AND _existing_role <> 'patient' THEN
    RAISE EXCEPTION 'Bu hisob allaqachon % roli bilan ro''yxatdan o''tgan. Bemor sifatida kirish uchun boshqa hisob yarating.', _existing_role;
  END IF;

  -- Assign 'patient' role only if no role exists
  IF _existing_role IS NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'patient');
  END IF;

  -- Check if user already has a linked patient record
  SELECT id INTO _patient_id FROM public.patients WHERE linked_user_id = auth.uid();
  IF _patient_id IS NOT NULL THEN
    RETURN _patient_id;
  END IF;

  _normalized_phone := public.normalize_phone(_phone);

  IF _normalized_phone IS NOT NULL THEN
    SELECT id INTO _patient_id 
    FROM public.patients 
    WHERE public.normalize_phone(phone) = _normalized_phone 
      AND linked_user_id IS NULL 
    LIMIT 1;
    
    IF _patient_id IS NOT NULL THEN
      UPDATE public.patients 
      SET linked_user_id = auth.uid(), 
          full_name = _full_name,
          phone = _normalized_phone
      WHERE id = _patient_id;
      RETURN _patient_id;
    END IF;
  END IF;

  INSERT INTO public.patients (full_name, phone, date_of_birth, gender, linked_user_id, organ_type, risk_level)
  VALUES (_full_name, _normalized_phone, _date_of_birth, _gender, auth.uid(), 'kidney', 'low')
  RETURNING id INTO _patient_id;

  RETURN _patient_id;
END;
$function$;
