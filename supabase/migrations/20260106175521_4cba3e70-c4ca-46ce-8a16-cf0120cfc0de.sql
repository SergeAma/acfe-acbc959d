-- Add RLS policy to allow public viewing of mentor profiles
-- This ensures mentor names, avatars, and bios display on course cards and detail pages

CREATE POLICY "Public can view mentor profiles" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'mentor'::user_role 
  AND account_status = 'active'
);

-- Also allow viewing profiles of mentors who have published courses (even if status isn't active)
CREATE POLICY "Public can view profiles of course mentors" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.mentor_id = profiles.id 
    AND courses.is_published = true
  )
);