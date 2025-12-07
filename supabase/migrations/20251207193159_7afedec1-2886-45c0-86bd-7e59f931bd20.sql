-- Add a restrictive policy that requires authentication for ALL access to contacts
-- This explicitly blocks anonymous/unauthenticated users from any operation
CREATE POLICY "Require authentication for all access"
ON public.contacts
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);