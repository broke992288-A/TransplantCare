
-- Medications table: tracks patient medications with dosage
CREATE TABLE public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL DEFAULT 'daily',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  prescribed_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Medication changes log: tracks every dosage change
CREATE TABLE public.medication_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL,
  old_dosage text NOT NULL,
  new_dosage text NOT NULL,
  old_frequency text,
  new_frequency text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_changes ENABLE ROW LEVEL SECURITY;

-- RLS for medications
CREATE POLICY "Authorized users see patient medications" ON public.medications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medications.patient_id
        AND (p.assigned_doctor_id = auth.uid() OR p.linked_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Doctors can insert medications" ON public.medications
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support')
  );

CREATE POLICY "Doctors can update medications" ON public.medications
  FOR UPDATE USING (
    has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support')
  );

CREATE POLICY "Doctors can delete medications" ON public.medications
  FOR DELETE USING (
    has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin')
  );

-- RLS for medication_changes
CREATE POLICY "Authorized users see medication changes" ON public.medication_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medication_changes.patient_id
        AND (p.assigned_doctor_id = auth.uid() OR p.linked_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Staff can insert medication changes" ON public.medication_changes
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support')
  );

-- Trigger: auto-create patient_alert on medication dosage change
CREATE OR REPLACE FUNCTION public.notify_medication_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.patient_alerts (patient_id, alert_type, severity, title, message)
  VALUES (
    NEW.patient_id,
    'medication',
    'warning',
    'Dori dozasi o''zgartirildi',
    'Dori: ' || (SELECT medication_name FROM public.medications WHERE id = NEW.medication_id) ||
    '. Eski doza: ' || NEW.old_dosage || ' → Yangi doza: ' || NEW.new_dosage ||
    COALESCE('. Sabab: ' || NEW.reason, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_medication_change
  AFTER INSERT ON public.medication_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_medication_change();

-- Enable realtime for medications
ALTER PUBLICATION supabase_realtime ADD TABLE public.medications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medication_changes;
