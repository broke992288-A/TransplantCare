CREATE TABLE public.client_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (event_type IN ('error','unhandled_rejection','long_task','freeze')),
  message text CHECK (char_length(message) <= 2000),
  stack text CHECK (char_length(stack) <= 8000),
  source text CHECK (char_length(source) <= 1000),
  route text CHECK (char_length(route) <= 500),
  host text CHECK (char_length(host) <= 200),
  duration_ms integer,
  session_id text CHECK (char_length(session_id) <= 64),
  user_id uuid,
  user_agent text CHECK (char_length(user_agent) <= 500),
  app_version text CHECK (char_length(app_version) <= 64),
  extra jsonb
);
GRANT INSERT ON public.client_diagnostics TO anon, authenticated;
GRANT SELECT ON public.client_diagnostics TO authenticated;
GRANT ALL ON public.client_diagnostics TO service_role;
ALTER TABLE public.client_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit diagnostics" ON public.client_diagnostics
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Admins read diagnostics" ON public.client_diagnostics
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_client_diagnostics_created ON public.client_diagnostics (created_at DESC);
CREATE INDEX idx_client_diagnostics_type_created ON public.client_diagnostics (event_type, created_at DESC);