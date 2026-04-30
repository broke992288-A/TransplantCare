-- Revoke PUBLIC execute on all SECURITY DEFINER functions, then re-grant
-- to 'authenticated' only for the ones the app actually calls from clients.

-- Trigger functions: not called directly, revoke from everyone
REVOKE ALL ON FUNCTION public.normalize_patient_phone() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_generate_lab_schedule() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_role_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_medication_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_patient_risk_from_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_medication_adherence_alert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_lab_abnormal_and_alert() FROM PUBLIC, anon, authenticated;

-- Helper functions used internally by other definers / RLS — restrict to authenticated only
REVOKE ALL ON FUNCTION public.normalize_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_phone(text) TO authenticated;

REVOKE ALL ON FUNCTION public.normalize_lab_value(text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_lab_value(text, numeric, text) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.calculate_risk_score_sql(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_risk_score_sql(text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.insert_lab_and_recalculate(jsonb, numeric, text, jsonb, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.insert_lab_and_recalculate(jsonb, numeric, text, jsonb, jsonb, text) TO authenticated;

REVOKE ALL ON FUNCTION public.register_patient_self(text, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_patient_self(text, text, date, text) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_lab_schedule(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_lab_schedule(uuid, date) TO authenticated;