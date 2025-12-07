-- Drop the policy that exposes mentor emails publicly
DROP POLICY IF EXISTS "Anyone can view mentor profiles" ON public.profiles;

-- Create a security definer function to get public mentor profile data WITHOUT email
CREATE OR REPLACE FUNCTION public.get_public_mentor_profiles()
RETURNS TABLE (
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
  website_url text
)
LANGUAGE sql
STABLE
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
    p.website_url
  FROM public.profiles p
  WHERE p.role = 'mentor'::user_role;
$$;

-- Create a function to get a single public mentor profile by ID (without email)
CREATE OR REPLACE FUNCTION public.get_public_mentor_profile(mentor_id uuid)
RETURNS TABLE (
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
  website_url text
)
LANGUAGE sql
STABLE
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
    p.website_url
  FROM public.profiles p
  WHERE p.id = mentor_id AND p.role = 'mentor'::user_role;
$$;