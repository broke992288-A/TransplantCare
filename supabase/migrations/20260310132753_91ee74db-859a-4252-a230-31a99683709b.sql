CREATE POLICY "Patients can delete own labs"
ON public.lab_results
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_results.patient_id
    AND p.linked_user_id = auth.uid()
  )
);