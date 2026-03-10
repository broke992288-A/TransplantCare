
-- Lab schedule table
CREATE TABLE public.lab_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due_soon', 'overdue', 'completed')),
  completed_lab_id uuid REFERENCES public.lab_results(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_lab_schedules_patient ON public.lab_schedules(patient_id, scheduled_date);
CREATE INDEX idx_lab_schedules_status ON public.lab_schedules(status);

-- Enable RLS
ALTER TABLE public.lab_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authorized users see lab schedules"
  ON public.lab_schedules FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = lab_schedules.patient_id
    AND (p.assigned_doctor_id = auth.uid() OR p.linked_user_id = auth.uid()
         OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  ));

CREATE POLICY "Doctors can insert lab schedules"
  ON public.lab_schedules FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can update lab schedules"
  ON public.lab_schedules FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can delete lab schedules"
  ON public.lab_schedules FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_schedules;

-- Function to generate lab schedule based on transplant date
CREATE OR REPLACE FUNCTION public.generate_lab_schedule(
  _patient_id uuid,
  _transplant_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _start date;
  _d date;
BEGIN
  _start := COALESCE(_transplant_date, CURRENT_DATE);
  
  -- Weeks 1-4: weekly
  FOR i IN 1..4 LOOP
    _d := _start + (i * 7);
    IF _d >= CURRENT_DATE THEN
      INSERT INTO public.lab_schedules (patient_id, scheduled_date)
      VALUES (_patient_id, _d)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- Months 2-3: every 2 weeks
  FOR i IN 1..4 LOOP
    _d := _start + 28 + (i * 14);
    IF _d >= CURRENT_DATE THEN
      INSERT INTO public.lab_schedules (patient_id, scheduled_date)
      VALUES (_patient_id, _d)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- Months 4-12: monthly
  FOR i IN 4..12 LOOP
    _d := _start + (i * 30);
    IF _d >= CURRENT_DATE THEN
      INSERT INTO public.lab_schedules (patient_id, scheduled_date)
      VALUES (_patient_id, _d)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- After 1 year: every 2 months for 2 more years
  FOR i IN 1..12 LOOP
    _d := _start + 365 + (i * 60);
    IF _d >= CURRENT_DATE THEN
      INSERT INTO public.lab_schedules (patient_id, scheduled_date)
      VALUES (_patient_id, _d)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Trigger: auto-generate schedule when patient is inserted with a transplant_date
CREATE OR REPLACE FUNCTION public.trg_generate_lab_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.transplant_date IS NOT NULL THEN
    PERFORM public.generate_lab_schedule(NEW.id, NEW.transplant_date);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_patient_lab_schedule
  AFTER INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_generate_lab_schedule();
