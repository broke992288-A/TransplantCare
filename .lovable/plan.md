# One risk engine + clinician verification gate

## What I found first (changes the plan slightly)

- The second engine is used in **3 places**, not one: `LabUploadDialog` (patient OCR), `AddLabDialog` (doctor manual entry), and `PatientDetail` (on-the-fly fallback when no snapshot exists). Deleting it means all three must move.
- Patients **cannot insert `risk_snapshots` today** (RLS allows only admin / assigned doctor). So the patient's client-side `insertRiskSnapshot` call is rejected and swallowed by `catch`. A client-side "call SQL, then insert the snapshot" design would also fail for patients. It would also let a client choose its own `verified_by_clinician` value.
- Fix: one new server function computes the score AND writes the snapshot. It decides `verified_by_clinician` from the caller's role. The browser never sends a score, level or flag.

## Database migration

```sql
ALTER TABLE public.risk_snapshots
  ADD COLUMN verified_by_clinician boolean NOT NULL DEFAULT false;
-- existing rows stay false (not auto-marked verified)

-- New: the only path for UI-saved labs to get a snapshot
CREATE FUNCTION public.record_lab_risk_snapshot(_lab_result_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE _pid uuid; _organ text; _risk jsonb; _rec timestamptz;
        _clin boolean; _sid uuid; _lab lab_results%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO _lab FROM lab_results WHERE id=_lab_result_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lab not found'; END IF;
  IF NOT can_access_patient(_lab.patient_id) THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
  _clin := has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM patients p
           WHERE p.id=_lab.patient_id AND p.assigned_doctor_id=auth.uid() AND has_role(auth.uid(),'doctor'));
  SELECT COALESCE(organ_type,'kidney') INTO _organ FROM patients WHERE id=_lab.patient_id;
  _risk := calculate_risk_score_sql(_organ, _lab.patient_id);     -- the single engine (v5.1)
  INSERT INTO risk_snapshots (patient_id, lab_result_id, score, risk_level, creatinine, alt, ast,
    total_bilirubin, tacrolimus_level, details, algorithm_version, is_historical, verified_by_clinician)
  VALUES (_lab.patient_id, _lab.id, COALESCE((_risk->>'score')::int,0), COALESCE(_risk->>'level','low'),
    _lab.creatinine, _lab.alt, _lab.ast, _lab.total_bilirubin, _lab.tacrolimus_level,
    _risk, _risk->>'algorithm_version', _lab.recorded_at < now()-interval '7 days', _clin)
  RETURNING id INTO _sid;
  RETURN _risk || jsonb_build_object('snapshot_id',_sid,'verified_by_clinician',_clin);
END $$;
REVOKE EXECUTE ON FUNCTION public.record_lab_risk_snapshot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_lab_risk_snapshot(uuid) TO authenticated;
```

`insert_lab_and_recalculate`: one-line change. Its snapshot INSERT adds `verified_by_clinician = true`. This is safe because the new gate already limits it to admin or the assigned doctor.

Direct inserts are also hardened with a BEFORE INSERT trigger on `risk_snapshots`. It sets `verified_by_clinician := false` unless the caller is admin or the assigned doctor, so it can't be forged.

### Trigger diff: `sync_patient_risk_from_snapshot`

```diff
 BEGIN
   IF COALESCE(NEW.is_historical, false) THEN
     RETURN NEW;
   END IF;
+  -- Unverified (patient-uploaded) snapshots only reach the patient record
+  -- when dangerous. Low/medium waits for clinician confirmation.
+  IF NOT NEW.verified_by_clinician AND NEW.risk_level <> 'high' THEN
+    RETURN NEW;
+  END IF;
   UPDATE public.patients
   SET risk_level = NEW.risk_level,
       risk_score = NEW.score::integer,
       last_risk_evaluation = NEW.created_at,
       updated_at = now()
   WHERE id = NEW.patient_id;
   RETURN NEW;
 END;
```

## LabUploadDialog.tsx diff (lines ~904–945)

```diff
-import { computeRiskScoreAsync, insertRiskSnapshot } from "@/services/riskSnapshotService";
+import { recordLabRiskSnapshot } from "@/services/riskSnapshotService";
 ...
-          if (organType) {
-            try {
-               const { score, level, flags, explanations } = await computeRiskScoreAsync(
-                 organType, savedLab as any, { ...patientData, transplant_date: undefined }, historicalWindow
-               );
-              const snapshot = await insertRiskSnapshot({
-                patient_id: patientId, lab_result_id: savedLab.id, score, risk_level: level,
-                creatinine: ..., alt: ..., ast: ..., total_bilirubin: ..., tacrolimus_level: ...,
-                details: { flags, explanations },
-              });
-              if (level === "high") { await insertPatientAlert({ severity: "critical", title: `${t("risk.highDetected")} (${score})`, ... }) }
-              else if (level === "medium") { await insertPatientAlert({ severity: "warning", ... }) }
+          if (savedLab?.id) {
+            try {
+              const risk = await recordLabRiskSnapshot(savedLab.id);  // server computes + writes
+              if (risk.level === "high") {
+                await insertPatientAlert({
+                  patient_id: patientId,
+                  risk_snapshot_id: risk.snapshot_id,
+                  severity: "critical",
+                  title: `${t("risk.highDetected")} (${risk.score})` +
+                    (risk.verified_by_clinician ? "" : ` — ${t("risk.pendingVerification")}`),
+                  message: risk.flags.join("; "),
+                });
+              }
+              // medium alerts: only for clinician-entered labs (unchanged behaviour there)
             } catch (riskErr) {
-              console.error("Risk calculation error:", riskErr);
+              console.error("[LabUpload] risk snapshot failed", riskErr);
+              toast({ title: t("common.error"), description: getErrorMessage(riskErr), variant: "destructive" });
             }
           }
-          historicalWindow = [savedLab, ...].slice(0, 4);   // no longer needed; SQL uses 14-day window
```

(`historicalWindow` and the unused `patientData` fields are removed.)

## Other callers

- **AddLabDialog.tsx** (doctor): same swap to `recordLabRiskSnapshot`. The result comes back `verified_by_clinician = true` automatically.
- **PatientDetail.tsx** fallback: the `computeRiskScore` on-the-fly display is removed. With no snapshot, the page shows the existing "no evaluation yet" state. It no longer shows a number from a different algorithm.
- **riskSnapshotService.ts**: `computeRiskScoreAsync`, `computeRiskScore`, and any helpers only they use are **deleted**. New `recordLabRiskSnapshot(labId)` has typed output `{score, level, flags, algorithm_version, snapshot_id, verified_by_clinician}`. Tests that exercise the TS engine are removed or rewritten against the RPC contract.
- New i18n key `risk.pendingVerification` (UZ / RU / EN).
- Doctor view: a snapshot with `verified_by_clinician = false` shows a small "Tasdiqlanmagan" badge next to the risk level.

## Confirmation after applying

- `rg computeRiskScore src supabase` returns zero hits. I'll show you the output.
- Typecheck, lint, all tests and the build are run for real.
- Live check: sign in as the patient, upload a lab, and confirm the snapshot is `verified_by_clinician = false`. Only a high result changes `patients.risk_level`.

## Not in scope

- The `recalculate-risk` server function still has its own logic for bulk/historical recalculation. It is listed in the roadmap as the next unification step, and I will point it out rather than change it silently.
- The Trend cards and Risk Score display stay unchanged.
