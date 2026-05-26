
-- Tighten medication_changes INSERT: authenticated only + patient ownership
DROP POLICY IF EXISTS "Staff can insert medication changes" ON public.medication_changes;

CREATE POLICY "Staff can insert medication changes"
ON public.medication_changes
FOR INSERT
TO authenticated
WITH CHECK (
  changed_by = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = medication_changes.patient_id
        AND p.assigned_doctor_id = auth.uid()
        AND (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'support'::app_role))
    )
  )
);

-- Tighten medications INSERT: authenticated only + patient ownership
DROP POLICY IF EXISTS "Doctors can insert medications" ON public.medications;

CREATE POLICY "Doctors can insert medications"
ON public.medications
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medications.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'support'::app_role))
  )
);

-- Tighten medications UPDATE: authenticated only + patient ownership
DROP POLICY IF EXISTS "Doctors can update medications" ON public.medications;

CREATE POLICY "Doctors can update medications"
ON public.medications
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medications.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'support'::app_role))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medications.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'support'::app_role))
  )
);

-- Tighten medications DELETE same way for consistency
DROP POLICY IF EXISTS "Doctors can delete medications" ON public.medications;

CREATE POLICY "Doctors can delete medications"
ON public.medications
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medications.patient_id
      AND p.assigned_doctor_id = auth.uid()
      AND has_role(auth.uid(), 'doctor'::app_role)
  )
);
