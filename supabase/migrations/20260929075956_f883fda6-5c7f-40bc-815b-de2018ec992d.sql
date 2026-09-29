-- #1 Scope doctor writes to assigned patients
DROP POLICY IF EXISTS doctor_notes_insert ON public.doctor_notes;
CREATE POLICY doctor_notes_insert ON public.doctor_notes FOR INSERT TO authenticated
WITH CHECK (doctor_id = auth.uid() AND (public.has_role(auth.uid(),'admin'::app_role) OR (public.has_role(auth.uid(),'doctor'::app_role) AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = doctor_notes.patient_id AND p.assigned_doctor_id = auth.uid()))));

DROP POLICY IF EXISTS "Doctors can insert events" ON public.patient_events;
CREATE POLICY "Doctors can insert events" ON public.patient_events FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR (public.has_role(auth.uid(),'doctor'::app_role) AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_events.patient_id AND p.assigned_doctor_id = auth.uid())));

DROP POLICY IF EXISTS "Doctors can delete events" ON public.patient_events;
CREATE POLICY "Doctors can delete events" ON public.patient_events FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR (public.has_role(auth.uid(),'doctor'::app_role) AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_events.patient_id AND p.assigned_doctor_id = auth.uid())));

DROP POLICY IF EXISTS "Doctors can manage transplant episodes" ON public.transplant_episodes;
CREATE POLICY "Doctors can manage transplant episodes" ON public.transplant_episodes FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR (public.has_role(auth.uid(),'doctor'::app_role) AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = transplant_episodes.patient_id AND p.assigned_doctor_id = auth.uid())))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR (public.has_role(auth.uid(),'doctor'::app_role) AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = transplant_episodes.patient_id AND p.assigned_doctor_id = auth.uid())));

-- #2 Patients may not touch deletion fields, move labs, or edit clinician-verified labs
CREATE OR REPLACE FUNCTION public.enforce_patient_lab_update_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(),'admin'::app_role)
     OR public.has_role(auth.uid(),'doctor'::app_role)
     OR public.has_role(auth.uid(),'support'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by
     OR NEW.delete_reason IS DISTINCT FROM OLD.delete_reason
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Patients cannot change ownership or deletion fields of lab results' USING ERRCODE = '42501';
  END IF;
  IF OLD.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Deleted lab results cannot be edited' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.risk_snapshots r WHERE r.lab_result_id = OLD.id AND r.verified_by_clinician) THEN
    RAISE EXCEPTION 'This lab was verified by a clinician and can no longer be edited by the patient' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_lab_update_scope() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_patient_lab_update_scope ON public.lab_results;
CREATE TRIGGER trg_enforce_patient_lab_update_scope BEFORE UPDATE ON public.lab_results
FOR EACH ROW EXECUTE FUNCTION public.enforce_patient_lab_update_scope();