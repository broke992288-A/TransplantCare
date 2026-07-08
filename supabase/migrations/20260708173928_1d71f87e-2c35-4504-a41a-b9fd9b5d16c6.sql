
CREATE POLICY "Patients insert own labs" ON public.lab_results
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = lab_results.patient_id
      AND p.linked_user_id = auth.uid()
  )
);

CREATE POLICY "Patients update own labs" ON public.lab_results
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = lab_results.patient_id
      AND p.linked_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = lab_results.patient_id
      AND p.linked_user_id = auth.uid()
  )
);
