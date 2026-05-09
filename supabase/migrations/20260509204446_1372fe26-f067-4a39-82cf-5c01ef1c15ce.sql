-- Restrict Realtime channel subscriptions to clinical staff only.
-- Patients data via Realtime postgres_changes broadcasts row payloads regardless of RLS on the source tables,
-- so we gate who can receive realtime messages at all. Patients still see their own data via standard queries.

ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinical staff can receive realtime" ON realtime.messages;
CREATE POLICY "Clinical staff can receive realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'support'::public.app_role)
);