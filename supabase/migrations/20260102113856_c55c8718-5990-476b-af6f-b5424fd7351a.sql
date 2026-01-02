-- Allow reading mentor profiles for course display
-- This policy allows anyone to read profile data for users who are mentors
CREATE POLICY "Anyone can view mentor profiles"
ON public.profiles
FOR SELECT
USING (role = 'mentor' AND account_status = 'active');

-- Also allow viewing profiles that are referenced in published courses
-- This handles edge cases where role might not be set correctly
CREATE POLICY "Anyone can view course mentor profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT DISTINCT mentor_id 
    FROM public.courses 
    WHERE is_published = true
  )
);