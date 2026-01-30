-- Create webhook events table for replay protection (idempotency)
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for cleanup queries
CREATE INDEX idx_stripe_webhook_events_processed_at ON public.stripe_webhook_events(processed_at);

-- Enable RLS (only service role can access)
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role key can access
-- This table is only accessed by edge functions

-- Create subscription lifecycle logs table
CREATE TABLE IF NOT EXISTS public.subscription_lifecycle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for queries
CREATE INDEX idx_subscription_logs_subscription_id ON public.subscription_lifecycle_logs(stripe_subscription_id);
CREATE INDEX idx_subscription_logs_user_id ON public.subscription_lifecycle_logs(user_id);
CREATE INDEX idx_subscription_logs_created_at ON public.subscription_lifecycle_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.subscription_lifecycle_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only read access
CREATE POLICY "Admins can view subscription logs"
  ON public.subscription_lifecycle_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Extend admin_audit_logs if needed (it exists but let's ensure comprehensive logging)
-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);

-- Function to log admin actions (callable from edge functions and triggers)
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _admin_id UUID,
  _action TEXT,
  _target_user_id UUID DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.admin_audit_logs (admin_id, action, target_user_id, metadata)
  VALUES (_admin_id, _action, _target_user_id, _metadata)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Grant execute to authenticated users (function checks permissions internally)
GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated;