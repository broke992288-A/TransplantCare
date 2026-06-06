
-- Restrict patient-initiated inserts on patient_alerts
DROP POLICY IF EXISTS "Patients can insert own alerts" ON public.patient_alerts;
CREATE POLICY "Patients can insert own alerts"
ON public.patient_alerts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_alerts.patient_id
      AND p.linked_user_id = auth.uid()
  )
  AND alert_type = 'patient_reported'
  AND severity IN ('info', 'warning')
  AND risk_snapshot_id IS NULL
);

-- Remove patient ability to write risk snapshots directly
DROP POLICY IF EXISTS "Patients can insert own risk snapshots" ON public.risk_snapshots;
