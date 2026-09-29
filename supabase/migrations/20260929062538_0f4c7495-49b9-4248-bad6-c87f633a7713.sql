CREATE OR REPLACE FUNCTION public.coalesce_recent_lab_values(_patient_id uuid, _window_days integer DEFAULT 14)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _result jsonb := '{}'::jsonb;
  _missing text[] := ARRAY[]::text[];
  _unverified text[] := ARRAY[]::text[];
  _params text[] := ARRAY[
    'creatinine','egfr','potassium','proteinuria','urea','phosphorus','magnesium','calcium',
    'alt','ast','total_bilirubin','direct_bilirubin','ggt','alp','inr','albumin','platelets',
    'tacrolimus_level','cyclosporine','hb','crp','bk_virus_load','cmv_load','dsa_mfi'
  ];
  _p text; _val numeric; _is_unverified boolean;
BEGIN
  IF _patient_id IS NULL THEN RETURN '{}'::jsonb; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.can_access_patient(_patient_id) THEN
    RAISE EXCEPTION 'Permission denied: cannot access this patient' USING ERRCODE = '42501';
  END IF;

  FOREACH _p IN ARRAY _params LOOP
    EXECUTE format(
      'SELECT v, unv FROM (
         SELECT COALESCE(prov.normalized_value, lr.%I) AS v,
                (prov.id IS NULL OR prov.unit_source = ''unknown'') AS unv, lr.recorded_at
         FROM public.lab_results lr
         LEFT JOIN public.lab_value_provenance prov
           ON prov.lab_result_id = lr.id AND prov.field_key = %L
         WHERE lr.patient_id = $1 AND lr.deleted_at IS NULL
           AND lr.recorded_at >= (now() - ($2 || '' days'')::interval)
           AND lr.%I IS NOT NULL
         ORDER BY lr.recorded_at DESC LIMIT 1
       ) s', _p, _p, _p)
    INTO _val, _is_unverified USING _patient_id, _window_days;

    IF _val IS NULL THEN
      _missing := array_append(_missing, _p);
    ELSE
      _result := _result || jsonb_build_object(_p, _val);
      IF COALESCE(_is_unverified, true) AND _p IN ('creatinine','total_bilirubin','direct_bilirubin','urea','hb') THEN
        _unverified := array_append(_unverified, _p);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('values', _result, 'data_missing', to_jsonb(_missing),
    'unit_unverified', to_jsonb(_unverified), 'window_days', _window_days,
    'incomplete', (array_length(_missing, 1) IS NOT NULL));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.coalesce_recent_lab_values(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_patient_has_active_schedule(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_resolve_missing_lab_alerts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_patient_alert_update_scope() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_ensure_active_schedule() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_patient_has_active_schedule(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.verify_risk_snapshot(_snapshot_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE _s public.risk_snapshots%ROWTYPE; _is_latest boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO _s FROM public.risk_snapshots WHERE id = _snapshot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Snapshot not found' USING ERRCODE='P0002'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR EXISTS (
      SELECT 1 FROM public.patients p WHERE p.id = _s.patient_id
        AND p.assigned_doctor_id = auth.uid() AND public.has_role(auth.uid(),'doctor'::app_role))) THEN
    RAISE EXCEPTION 'Permission denied: only admins or the assigned doctor can verify' USING ERRCODE='42501';
  END IF;
  IF _s.verified_by_clinician THEN
    RETURN jsonb_build_object('snapshot_id', _s.id, 'already_verified', true);
  END IF;

  UPDATE public.risk_snapshots SET verified_by_clinician = true WHERE id = _s.id;

  SELECT NOT EXISTS (SELECT 1 FROM public.risk_snapshots r
    WHERE r.patient_id = _s.patient_id AND r.created_at > _s.created_at) INTO _is_latest;
  IF _is_latest AND NOT COALESCE(_s.is_historical,false) THEN
    UPDATE public.patients SET risk_level = _s.risk_level, risk_score = _s.score::integer,
      last_risk_evaluation = _s.created_at, updated_at = now() WHERE id = _s.patient_id;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'risk_snapshot_verified', 'risk_snapshot', _s.id,
    jsonb_build_object('patient_id', _s.patient_id, 'risk_level', _s.risk_level, 'score', _s.score));

  RETURN jsonb_build_object('snapshot_id', _s.id, 'verified', true, 'patient_updated', _is_latest);
END $function$;

REVOKE EXECUTE ON FUNCTION public.verify_risk_snapshot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_risk_snapshot(uuid) TO authenticated;