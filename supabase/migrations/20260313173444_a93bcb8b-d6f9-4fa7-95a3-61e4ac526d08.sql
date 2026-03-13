
-- Medication adherence tracking table
CREATE TABLE public.medication_adherence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  taken boolean NOT NULL DEFAULT false,
  taken_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(medication_id, scheduled_date)
);

-- Enable RLS
ALTER TABLE public.medication_adherence ENABLE ROW LEVEL SECURITY;

-- Patients can see and manage their own adherence records
CREATE POLICY "Patients see own adherence"
  ON public.medication_adherence FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medication_adherence.patient_id
      AND (p.linked_user_id = auth.uid() OR p.assigned_doctor_id = auth.uid()
           OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
    )
  );

CREATE POLICY "Patients insert own adherence"
  ON public.medication_adherence FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medication_adherence.patient_id
      AND (p.linked_user_id = auth.uid() OR has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Patients update own adherence"
  ON public.medication_adherence FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medication_adherence.patient_id
      AND (p.linked_user_id = auth.uid() OR has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'))
    )
  );

-- Index for performance
CREATE INDEX idx_med_adherence_patient_date ON public.medication_adherence(patient_id, scheduled_date);
CREATE INDEX idx_med_adherence_medication ON public.medication_adherence(medication_id, scheduled_date);

-- Trigger: when medication dose is missed for 2+ consecutive days, create alert
CREATE OR REPLACE FUNCTION public.check_medication_adherence_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _missed_count integer;
  _med_name text;
BEGIN
  -- Only trigger on non-taken records
  IF NEW.taken = true THEN RETURN NEW; END IF;

  -- Count consecutive missed days for this medication
  SELECT COUNT(*) INTO _missed_count
  FROM public.medication_adherence
  WHERE medication_id = NEW.medication_id
    AND taken = false
    AND scheduled_date >= (CURRENT_DATE - INTERVAL '3 days')
    AND scheduled_date <= CURRENT_DATE;

  IF _missed_count >= 2 THEN
    SELECT medication_name INTO _med_name
    FROM public.medications WHERE id = NEW.medication_id;

    INSERT INTO public.patient_alerts (patient_id, alert_type, severity, title, message)
    VALUES (
      NEW.patient_id,
      'medication_adherence',
      'warning',
      'Dori qabul qilinmayapti',
      COALESCE(_med_name, 'Noma''lum dori') || ' - ' || _missed_count || ' kun davomida qabul qilinmadi'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_med_adherence
  AFTER INSERT OR UPDATE ON public.medication_adherence
  FOR EACH ROW
  EXECUTE FUNCTION public.check_medication_adherence_alert();
