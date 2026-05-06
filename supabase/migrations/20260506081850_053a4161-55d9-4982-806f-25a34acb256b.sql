CREATE POLICY "Users can update own subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());