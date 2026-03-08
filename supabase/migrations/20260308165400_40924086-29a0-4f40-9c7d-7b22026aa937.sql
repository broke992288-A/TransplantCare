
-- Add risk_score and last_risk_evaluation to patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS last_risk_evaluation timestamptz;

-- Update sync trigger to also set risk_score and last_risk_evaluation
CREATE OR REPLACE FUNCTION public.sync_patient_risk_from_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.patients
  SET risk_level = NEW.risk_level,
      risk_score = NEW.score::integer,
      last_risk_evaluation = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.patient_id;
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_sync_patient_risk_from_snapshot ON public.risk_snapshots;
CREATE TRIGGER trg_sync_patient_risk_from_snapshot
  AFTER INSERT ON public.risk_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.sync_patient_risk_from_snapshot();
