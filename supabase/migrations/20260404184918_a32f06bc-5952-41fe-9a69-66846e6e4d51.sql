-- ============================================================
-- Fix overly permissive storage policies on lab_reports bucket
-- Doctors should only access files of their assigned patients
-- ============================================================

-- Drop overly permissive policies that allow ANY doctor to upload/delete ANY report
DROP POLICY IF EXISTS "Doctors can delete reports" ON storage.objects;
DROP POLICY IF EXISTS "Secure lab report delete access" ON storage.objects;
DROP POLICY IF EXISTS "Secure lab report upload access" ON storage.objects;

-- Drop duplicate/overlapping policies to consolidate
DROP POLICY IF EXISTS "Patients upload own reports" ON storage.objects;
DROP POLICY IF EXISTS "Patients view own reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own lab reports" ON storage.objects;
DROP POLICY IF EXISTS "Patient or doctor can upload lab reports" ON storage.objects;
DROP POLICY IF EXISTS "Patient or doctor can view lab reports" ON storage.objects;
DROP POLICY IF EXISTS "Secure lab report read access" ON storage.objects;

-- ============================================================
-- Create clean, consolidated policies
-- Folder structure: lab_reports/{patient_id}/filename
-- ============================================================

-- SELECT: Patient sees own files, doctor sees assigned patient files, admin/support see all
CREATE POLICY "lab_reports_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lab_reports'
  AND (
    -- Patient: folder name matches a patient linked to this user
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.linked_user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
    -- Doctor: folder name matches a patient assigned to this doctor
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.assigned_doctor_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
    -- Admin or support: full access
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'support')
  )
);

-- INSERT: Patient uploads to own folder, doctor uploads to assigned patient folder, admin uploads anywhere
CREATE POLICY "lab_reports_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lab_reports'
  AND (
    -- Patient: folder matches their linked patient
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.linked_user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
    -- Doctor: folder matches assigned patient
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.assigned_doctor_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
    -- Admin
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- DELETE: Patient deletes own files, doctor deletes assigned patient files, admin deletes any
CREATE POLICY "lab_reports_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lab_reports'
  AND (
    -- Patient: folder matches their linked patient
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.linked_user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
    -- Doctor: folder matches assigned patient
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.assigned_doctor_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
    -- Admin
    OR public.has_role(auth.uid(), 'admin')
  )
);