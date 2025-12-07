-- Update the INSERT policy to require authentication
DROP POLICY IF EXISTS "Anyone can submit ideas" ON public.idea_submissions;

CREATE POLICY "Authenticated users can submit ideas" 
ON public.idea_submissions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);