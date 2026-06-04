
ALTER TABLE public.patient_alerts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','acknowledged','reviewed','resolved','dismissed'));
ALTER TABLE public.patient_alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE public.patient_alerts ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES auth.users(id);
ALTER TABLE public.patient_alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.patient_alerts ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);
ALTER TABLE public.patient_alerts ADD COLUMN IF NOT EXISTS resolution_note TEXT;

UPDATE public.patient_alerts SET status = 'resolved', resolved_at = COALESCE(resolved_at, created_at) WHERE is_read = true AND status = 'new';
