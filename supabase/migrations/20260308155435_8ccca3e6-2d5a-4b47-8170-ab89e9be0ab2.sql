
-- 1. Trigger to restrict self-assigned roles: only 'patient' allowed without admin
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If role is not 'patient', the caller must be an admin
  IF NEW.role <> 'patient' THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only administrators can assign the % role', NEW.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_role_assignment
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_assignment();

-- 2. Add support role to patients SELECT policy
DROP POLICY IF EXISTS "Doctors see assigned patients" ON public.patients;
CREATE POLICY "Doctors see assigned patients" ON public.patients
  FOR SELECT USING (
    assigned_doctor_id = auth.uid()
    OR linked_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'support'::app_role)
  );

-- 3. Add support to lab_results SELECT
DROP POLICY IF EXISTS "Doctors see patient labs" ON public.lab_results;
CREATE POLICY "Doctors see patient labs" ON public.lab_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = lab_results.patient_id
      AND (
        p.assigned_doctor_id = auth.uid()
        OR p.linked_user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'support'::app_role)
      )
    )
  );

-- 4. Add support to patient_events SELECT
DROP POLICY IF EXISTS "Authorized users see patient events" ON public.patient_events;
CREATE POLICY "Authorized users see patient events" ON public.patient_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_events.patient_id
      AND (
        p.assigned_doctor_id = auth.uid()
        OR p.linked_user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'support'::app_role)
      )
    )
  );

-- 5. Add support to patient_alerts SELECT
DROP POLICY IF EXISTS "Authorized users see patient alerts" ON public.patient_alerts;
CREATE POLICY "Authorized users see patient alerts" ON public.patient_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_alerts.patient_id
      AND (
        p.assigned_doctor_id = auth.uid()
        OR p.linked_user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'support'::app_role)
      )
    )
  );

-- 6. Add support to risk_snapshots SELECT
DROP POLICY IF EXISTS "Authorized users see risk snapshots" ON public.risk_snapshots;
CREATE POLICY "Authorized users see risk snapshots" ON public.risk_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = risk_snapshots.patient_id
      AND (
        p.assigned_doctor_id = auth.uid()
        OR p.linked_user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'support'::app_role)
      )
    )
  );

-- 7. Add support to medications SELECT
DROP POLICY IF EXISTS "Authorized users see patient medications" ON public.medications;
CREATE POLICY "Authorized users see patient medications" ON public.medications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medications.patient_id
      AND (
        p.assigned_doctor_id = auth.uid()
        OR p.linked_user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'support'::app_role)
      )
    )
  );

-- 8. Add support to medication_changes SELECT
DROP POLICY IF EXISTS "Authorized users see medication changes" ON public.medication_changes;
CREATE POLICY "Authorized users see medication changes" ON public.medication_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medication_changes.patient_id
      AND (
        p.assigned_doctor_id = auth.uid()
        OR p.linked_user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'support'::app_role)
      )
    )
  );
