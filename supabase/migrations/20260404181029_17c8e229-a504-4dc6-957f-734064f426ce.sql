
-- 1) Drop existing permissive policies
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can set own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own role" ON public.user_roles;

-- 2) READ: authenticated users read own roles
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3) INSERT: only admin
CREATE POLICY "Only admin can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) UPDATE: only admin
CREATE POLICY "Only admin can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5) DELETE: only admin
CREATE POLICY "Only admin can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6) Update register_patient_self to also assign 'patient' role (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.register_patient_self(
  _full_name text,
  _phone text DEFAULT NULL,
  _date_of_birth date DEFAULT NULL,
  _gender text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _patient_id uuid;
  _normalized_phone text;
BEGIN
  -- Assign 'patient' role if not already assigned (bypasses RLS via SECURITY DEFINER)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Check if user already has a linked patient record
  SELECT id INTO _patient_id FROM public.patients WHERE linked_user_id = auth.uid();
  IF _patient_id IS NOT NULL THEN
    RETURN _patient_id;
  END IF;

  _normalized_phone := public.normalize_phone(_phone);

  -- Check if there's a patient with matching phone (doctor pre-created)
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
$$;
