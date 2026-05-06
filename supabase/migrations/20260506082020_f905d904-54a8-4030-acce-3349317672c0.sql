REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb) FROM anon;

REVOKE EXECUTE ON FUNCTION public.check_lab_abnormal_and_alert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_medication_adherence_alert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_medication_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_patient_risk_from_snapshot() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_generate_lab_schedule() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_role_assignment() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_risk_score_sql(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_lab_schedule(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_lab_and_recalculate(jsonb, numeric, text, jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_patient_self(text, text, date, text) FROM anon;