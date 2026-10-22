DROP POLICY IF EXISTS "Anyone can read lab reference profiles" ON public.lab_reference_profiles;
CREATE POLICY "Authenticated users can read lab reference profiles" ON public.lab_reference_profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anyone can read clinical thresholds" ON public.clinical_thresholds;
CREATE POLICY "Authenticated users can read clinical thresholds" ON public.clinical_thresholds FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.lab_reference_profiles FROM anon;
REVOKE SELECT ON public.clinical_thresholds FROM anon;