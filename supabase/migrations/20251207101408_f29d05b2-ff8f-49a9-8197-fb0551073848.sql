-- Allow authenticated users to view their own idea submissions by matching email
CREATE POLICY "Users can view own submissions" 
ON public.idea_submissions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);