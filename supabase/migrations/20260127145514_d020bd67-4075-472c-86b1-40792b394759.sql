-- Create a simpler function for course mentor display that doesn't require professional completeness
-- This is used when displaying mentor info on course cards and detail pages
CREATE OR REPLACE FUNCTION public.get_course_mentor_profile(course_mentor_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  bio text,
  avatar_url text,
  profile_frame text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.bio,
    p.avatar_url,
    p.profile_frame::text
  FROM public.profiles p
  WHERE p.id = course_mentor_id;
$$;

-- Grant execute to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_course_mentor_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_mentor_profile(uuid) TO anon;