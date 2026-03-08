
-- PERFORMANCE INDEXES

-- patients indexes
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON public.patients (created_at);
CREATE INDEX IF NOT EXISTS idx_patients_organ_type ON public.patients (organ_type);
CREATE INDEX IF NOT EXISTS idx_patients_risk_level ON public.patients (risk_level);
CREATE INDEX IF NOT EXISTS idx_patients_assigned_doctor_id ON public.patients (assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_linked_user_id ON public.patients (linked_user_id);

-- lab_results indexes
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON public.lab_results (patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_recorded_at ON public.lab_results (recorded_at);
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_recorded ON public.lab_results (patient_id, recorded_at DESC);

-- patient_alerts indexes
CREATE INDEX IF NOT EXISTS idx_patient_alerts_patient_id ON public.patient_alerts (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_alerts_is_read ON public.patient_alerts (is_read);
CREATE INDEX IF NOT EXISTS idx_patient_alerts_patient_unread ON public.patient_alerts (patient_id, is_read) WHERE is_read = false;

-- medications indexes
CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON public.medications (patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_is_active ON public.medications (is_active);

-- risk_snapshots indexes
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_patient_id ON public.risk_snapshots (patient_id);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_created_at ON public.risk_snapshots (created_at);

-- audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at);

-- user_roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
