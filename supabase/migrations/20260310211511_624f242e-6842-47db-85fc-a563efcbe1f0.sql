
-- Add trend_flags and algorithm_version columns to risk_snapshots
ALTER TABLE public.risk_snapshots 
  ADD COLUMN IF NOT EXISTS trend_flags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS algorithm_version text DEFAULT 'v2.0';
