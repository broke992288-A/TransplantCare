
-- Create clinical_thresholds table
CREATE TABLE public.clinical_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter text NOT NULL,
  organ_type text NOT NULL,
  warning_min numeric,
  warning_max numeric,
  critical_min numeric,
  critical_max numeric,
  unit text NOT NULL DEFAULT 'mg/dL',
  normal_min numeric,
  normal_max numeric,
  guideline_source text NOT NULL DEFAULT 'General',
  guideline_year integer NOT NULL DEFAULT 2020,
  evidence_level text,
  reference_url text,
  trend_threshold_pct numeric,
  trend_direction text,
  risk_points_warning integer NOT NULL DEFAULT 10,
  risk_points_critical integer NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parameter, organ_type)
);

-- Enable RLS
ALTER TABLE public.clinical_thresholds ENABLE ROW LEVEL SECURITY;

-- Everyone can read thresholds (public clinical data)
CREATE POLICY "Anyone can read clinical thresholds"
  ON public.clinical_thresholds FOR SELECT
  TO public
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage clinical thresholds"
  ON public.clinical_thresholds FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_clinical_thresholds_updated_at
  BEFORE UPDATE ON public.clinical_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
