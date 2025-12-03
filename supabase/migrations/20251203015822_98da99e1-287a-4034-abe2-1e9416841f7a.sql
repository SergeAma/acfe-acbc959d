-- Drop the existing restrictive policy for viewing published courses
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;

-- Create a PERMISSIVE policy that allows anyone (including unauthenticated users) to view published courses
CREATE POLICY "Anyone can view published courses"
ON public.courses
FOR SELECT
USING ((is_published = true) OR (auth.uid() = mentor_id));