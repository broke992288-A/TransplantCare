CREATE POLICY "Doctors can update lab reports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lab_reports'
  AND (
    public.has_role(auth.uid(), 'doctor'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'lab_reports'
  AND (
    public.has_role(auth.uid(), 'doctor'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);