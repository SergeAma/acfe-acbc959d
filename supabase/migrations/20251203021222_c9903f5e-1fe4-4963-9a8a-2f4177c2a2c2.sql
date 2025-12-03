-- Add a permissive policy to allow anyone (including anonymous users) to read mentor profiles
-- This enables the public /mentors page to work without authentication
CREATE POLICY "Anyone can view mentor profiles"
ON public.profiles
FOR SELECT
USING (role = 'mentor');