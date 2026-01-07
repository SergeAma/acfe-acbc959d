-- Fix: Replace SECURITY DEFINER view with regular view that uses RLS
DROP VIEW IF EXISTS public.pending_notifications;

-- Create regular view (uses invoker's permissions, respects RLS)
CREATE VIEW public.pending_notifications 
WITH (security_invoker = true)
AS
SELECT 
  n.id,
  n.user_id,
  n.message,
  n.link,
  n.action_type,
  n.action_reference_id,
  n.created_at
FROM public.notifications n
WHERE NOT public.is_notification_action_completed(n.action_type, n.action_reference_id);

-- Grant access to the view
GRANT SELECT ON public.pending_notifications TO authenticated;