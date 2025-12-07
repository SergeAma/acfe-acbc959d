-- Drop the overly permissive policy that allows any authenticated user to access all submissions
-- This policy incorrectly grants SELECT/UPDATE/DELETE to any authenticated user
DROP POLICY IF EXISTS "Require authentication for all access" ON public.idea_submissions;

-- The remaining policies correctly restrict access:
-- - "Admins can view all submissions" - SELECT for admins only
-- - "Admins can update submissions" - UPDATE for admins only  
-- - "Authenticated users can submit ideas" - INSERT with submitter_id = auth.uid()
-- - "Users can view own submissions" - SELECT with submitter_id = auth.uid()