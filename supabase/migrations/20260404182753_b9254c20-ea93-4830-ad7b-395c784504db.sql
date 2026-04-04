
-- Fix search_path for all functions to prevent injection attacks

ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.register_patient_self(text, text, date, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.normalize_phone(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_lab_abnormal_and_alert() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_medication_adherence_alert() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_medication_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_patient_risk_from_snapshot() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_role_assignment() SET search_path = public, pg_temp;
ALTER FUNCTION public.insert_lab_and_recalculate(jsonb, numeric, text, jsonb, jsonb, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_risk_score_sql(text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.normalize_lab_value(text, numeric, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_lab_schedule(uuid, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.normalize_patient_phone() SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_generate_lab_schedule() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
