-- Add a restrictive policy that requires authentication for ALL access to idea_submissions
-- This explicitly blocks anonymous/unauthenticated users from any operation
CREATE POLICY "Require authentication for all access"
ON public.idea_submissions
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);