
-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own logs
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all audit logs
CREATE POLICY "Admins can read all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Doctors can read audit logs for their patients
CREATE POLICY "Doctors can read related audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Update storage RLS: drop old permissive policies and add restrictive ones
-- First drop existing storage policies if any
DROP POLICY IF EXISTS "Authenticated users can upload lab reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view lab reports" ON storage.objects;
DROP POLICY IF EXISTS "Lab reports are viewable by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Lab reports are uploadable by authenticated users" ON storage.objects;

-- Only patient who owns the file or assigned doctor can view
CREATE POLICY "Patient or doctor can view lab reports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lab_reports' AND (
      -- Patient owns the file (path starts with patient_id linked to user)
      EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.linked_user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
      )
      OR
      -- Doctor assigned to patient
      EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.assigned_doctor_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
      )
      OR
      public.has_role(auth.uid(), 'admin')
    )
  );

-- Only patient can upload to their own folder
CREATE POLICY "Patient or doctor can upload lab reports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lab_reports' AND (
      EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.linked_user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
      )
      OR
      EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.assigned_doctor_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
      )
      OR
      public.has_role(auth.uid(), 'admin')
    )
  );
