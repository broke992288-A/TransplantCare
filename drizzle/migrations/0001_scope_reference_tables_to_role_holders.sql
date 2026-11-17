DROP POLICY IF EXISTS "Authenticated users can read lab reference profiles" ON public.lab_reference_profiles;
CREATE POLICY "Role holders can read lab reference profiles" ON public.lab_reference_profiles
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read clinical thresholds" ON public.clinical_thresholds;
CREATE POLICY "Role holders can read clinical thresholds" ON public.clinical_thresholds
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));