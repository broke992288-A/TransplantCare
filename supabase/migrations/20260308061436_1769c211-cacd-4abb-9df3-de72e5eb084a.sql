CREATE POLICY "Patients can update own labs"
ON public.lab_results
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM patients p
  WHERE p.id = lab_results.patient_id AND p.linked_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM patients p
  WHERE p.id = lab_results.patient_id AND p.linked_user_id = auth.uid()
));

CREATE POLICY "Doctors can update labs"
ON public.lab_results
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));