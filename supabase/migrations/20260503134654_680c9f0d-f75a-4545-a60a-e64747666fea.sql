
DROP POLICY IF EXISTS "Doctors can read all subscriptions for notifications" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _action NOT IN ('user_login','patient_login','lab_upload','lab_result_edit','doctor_view_patient','patient_logout','password_reset') THEN
    RAISE EXCEPTION 'Invalid audit action: %', _action;
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb) TO authenticated;

DROP POLICY IF EXISTS "Doctors can update lab reports" ON storage.objects;
CREATE POLICY "lab_reports_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'lab_reports' AND (
    EXISTS (SELECT 1 FROM public.patients p WHERE p.assigned_doctor_id = auth.uid() AND (storage.foldername(objects.name))[1] = (p.id)::text)
    OR public.has_role(auth.uid(), 'admin')
  )
)
WITH CHECK (
  bucket_id = 'lab_reports' AND (
    EXISTS (SELECT 1 FROM public.patients p WHERE p.assigned_doctor_id = auth.uid() AND (storage.foldername(objects.name))[1] = (p.id)::text)
    OR public.has_role(auth.uid(), 'admin')
  )
);
