-- Drop overly permissive insert policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Insert operations will be handled by service role key in edge functions (bypasses RLS)
-- Add delete policy so users can clear their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);