ALTER TABLE public.risk_snapshots
  ADD COLUMN IF NOT EXISTS verified_by_clinician boolean NOT NULL DEFAULT false;

-- Server decides verification from caller role; clients cannot forge it.
CREATE OR REPLACE FUNCTION public.set_snapshot_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    -- trusted server context (service role / cron / triggers): no patient caller
    NEW.verified_by_clinician := true;
  ELSE
    NEW.verified_by_clinician :=
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.patients p
                 WHERE p.id = NEW.patient_id
                   AND p.assigned_doctor_id = auth.uid()
                   AND public.has_role(auth.uid(), 'doctor'::app_role));
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_snapshot_verification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_set_snapshot_verification ON public.risk_snapshots;
CREATE TRIGGER trg_set_snapshot_verification
  BEFORE INSERT ON public.risk_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_snapshot_verification();

CREATE OR REPLACE FUNCTION public.sync_patient_risk_from_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF COALESCE(NEW.is_historical, false) THEN
    RETURN NEW;
  END IF;
  -- Unverified (patient-uploaded) snapshots only reach the patient record
  -- when dangerous. Low/medium waits for clinician confirmation.
  IF NOT NEW.verified_by_clinician AND NEW.risk_level <> 'high' THEN
    RETURN NEW;
  END IF;
  UPDATE public.patients
  SET risk_level = NEW.risk_level,
      risk_score = NEW.score::integer,
      last_risk_evaluation = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.patient_id;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.record_lab_risk_snapshot(_lab_result_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE _organ text; _risk jsonb; _sid uuid; _clin boolean; _lab public.lab_results%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO _lab FROM public.lab_results WHERE id = _lab_result_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lab not found' USING ERRCODE='P0002'; END IF;
  IF NOT public.can_access_patient(_lab.patient_id) THEN
    RAISE EXCEPTION 'Permission denied for patient %', _lab.patient_id USING ERRCODE='42501';
  END IF;
  SELECT COALESCE(organ_type,'kidney') INTO _organ FROM public.patients WHERE id = _lab.patient_id;
  _risk := public.calculate_risk_score_sql(_organ, _lab.patient_id);
  INSERT INTO public.risk_snapshots (patient_id, lab_result_id, score, risk_level, creatinine, alt, ast,
    total_bilirubin, tacrolimus_level, details, algorithm_version, is_historical)
  VALUES (_lab.patient_id, _lab.id, COALESCE((_risk->>'score')::numeric,0), COALESCE(_risk->>'level','low'),
    _lab.creatinine, _lab.alt, _lab.ast, _lab.total_bilirubin, _lab.tacrolimus_level,
    _risk, _risk->>'algorithm_version', _lab.recorded_at < now() - interval '7 days')
  RETURNING id, verified_by_clinician INTO _sid, _clin;
  RETURN _risk || jsonb_build_object('snapshot_id', _sid, 'verified_by_clinician', _clin);
END $$;
REVOKE EXECUTE ON FUNCTION public.record_lab_risk_snapshot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_lab_risk_snapshot(uuid) TO authenticated;