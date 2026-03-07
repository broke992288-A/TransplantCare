
-- Make lab_reports bucket private
UPDATE storage.buckets SET public = false WHERE id = 'lab_reports';

-- Storage policy: patients can upload to their own folder
CREATE POLICY "Patients upload own reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lab_reports'
  AND (storage.foldername(name))[1] = (
    SELECT p.id::text FROM public.patients p WHERE p.linked_user_id = auth.uid() LIMIT 1
  )
);

-- Storage policy: patients can view their own files
CREATE POLICY "Patients view own reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lab_reports'
  AND (
    -- Patient owns the file
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.patients p WHERE p.linked_user_id = auth.uid()
    )
    OR
    -- Doctor assigned to the patient
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.patients p WHERE p.assigned_doctor_id = auth.uid()
    )
    OR
    -- Admin
    public.has_role(auth.uid(), 'admin')
  )
);

-- Storage policy: doctors/admins can delete reports
CREATE POLICY "Doctors can delete reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lab_reports'
  AND (
    public.has_role(auth.uid(), 'doctor')
    OR public.has_role(auth.uid(), 'admin')
  )
);
