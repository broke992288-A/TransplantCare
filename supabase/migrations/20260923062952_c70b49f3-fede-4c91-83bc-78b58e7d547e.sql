-- ── 1. Deterministic latest-lab-per-patient RPC ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_latest_labs_for_patients(_patient_ids uuid[])
RETURNS TABLE (
  patient_id uuid,
  tacrolimus_level numeric,
  creatinine numeric,
  alt numeric,
  ast numeric,
  total_bilirubin numeric,
  egfr numeric,
  potassium numeric,
  recorded_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT ON (lr.patient_id)
    lr.patient_id, lr.tacrolimus_level, lr.creatinine, lr.alt, lr.ast,
    lr.total_bilirubin, lr.egfr, lr.potassium, lr.recorded_at
  FROM public.lab_results lr
  WHERE lr.patient_id = ANY(_patient_ids)
    AND lr.deleted_at IS NULL
  ORDER BY lr.patient_id, lr.recorded_at DESC, lr.id DESC
$$;

REVOKE EXECUTE ON FUNCTION public.get_latest_labs_for_patients(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_latest_labs_for_patients(uuid[]) TO authenticated, service_role;

-- ── 2. Notification idempotency log ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  notification_type text NOT NULL,
  target_user_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinicians can read notification log" ON public.notification_log;
CREATE POLICY "Clinicians can read notification log"
ON public.notification_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'doctor'::app_role)
);

CREATE INDEX IF NOT EXISTS idx_notification_log_type_created
  ON public.notification_log (notification_type, created_at DESC);

-- ── 3. Performance indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_recorded
  ON public.lab_results (patient_id, recorded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_medications_patient
  ON public.medications (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_events_patient_created
  ON public.patient_events (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_patients_assigned_doctor
  ON public.patients (assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_linked_user
  ON public.patients (linked_user_id);
CREATE INDEX IF NOT EXISTS idx_patient_alerts_patient_status
  ON public.patient_alerts (patient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_patient_created
  ON public.risk_snapshots (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_schedules_patient_date
  ON public.lab_schedules (patient_id, scheduled_date) WHERE deleted_at IS NULL;
