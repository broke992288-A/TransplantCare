-- 1. Foreign keys with RESTRICT (guarded with DO blocks for idempotency)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lab_patient') THEN
    ALTER TABLE public.lab_results
      ADD CONSTRAINT fk_lab_patient
      FOREIGN KEY (patient_id) REFERENCES public.patients(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_alert_patient') THEN
    ALTER TABLE public.patient_alerts
      ADD CONSTRAINT fk_alert_patient
      FOREIGN KEY (patient_id) REFERENCES public.patients(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_med_patient') THEN
    ALTER TABLE public.medications
      ADD CONSTRAINT fk_med_patient
      FOREIGN KEY (patient_id) REFERENCES public.patients(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 2. Soft delete columns
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_lab_patient_date
  ON public.lab_results(patient_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_patient_read
  ON public.patient_alerts(patient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_unread
  ON public.patient_alerts(is_read, created_at DESC);