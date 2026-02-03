-- Add RLS policy for stripe_webhook_events table (critical security fix)
-- This table already has RLS enabled but needs policies

-- Allow only service role (edge functions) to insert webhook events
-- No direct user access needed - webhooks are processed server-side
CREATE POLICY "Only service role can insert webhook events"
ON public.stripe_webhook_events
FOR INSERT
WITH CHECK (false);  -- Deny all client inserts; edge functions use service role which bypasses RLS

-- Allow admins to view webhook events for debugging
CREATE POLICY "Admins can view webhook events"
ON public.stripe_webhook_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No update/delete needed for this audit log table
CREATE POLICY "No updates allowed on webhook events"
ON public.stripe_webhook_events
FOR UPDATE
USING (false);

CREATE POLICY "No deletes allowed on webhook events"
ON public.stripe_webhook_events
FOR DELETE
USING (false);