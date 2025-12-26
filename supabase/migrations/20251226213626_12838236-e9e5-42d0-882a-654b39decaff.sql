-- Update RPC to only return active mentors (filter out paused/deleted accounts)
CREATE OR REPLACE FUNCTION public.get_public_mentor_profiles()
RETURNS TABLE(
  id uuid,
  full_name text,
  bio text,
  avatar_url text,
  profile_frame text,
  role text,
  linkedin_url text,
  twitter_url text,
  instagram_url text,
  github_url text,
  website_url text,
  companies_worked_for text[],
  skills text[]
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
    p.profile_frame,
    p.role::text,
    p.linkedin_url,
    p.twitter_url,
    p.instagram_url,
    p.github_url,
    p.website_url,
    p.companies_worked_for,
    p.skills
  FROM public.profiles p
  WHERE p.role = 'mentor'::user_role
    AND p.account_status = 'active';
$$;