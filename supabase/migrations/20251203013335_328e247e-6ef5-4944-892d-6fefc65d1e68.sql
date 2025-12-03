-- Drop the existing view and recreate with mentor profile details
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT 
  p.id,
  p.full_name,
  p.role,
  -- Only expose these fields for mentors
  CASE WHEN p.role = 'mentor' THEN p.avatar_url ELSE NULL END as avatar_url,
  CASE WHEN p.role = 'mentor' THEN p.bio ELSE NULL END as bio,
  CASE WHEN p.role = 'mentor' THEN p.profile_frame ELSE NULL END as profile_frame,
  CASE WHEN p.role = 'mentor' THEN p.linkedin_url ELSE NULL END as linkedin_url,
  CASE WHEN p.role = 'mentor' THEN p.twitter_url ELSE NULL END as twitter_url,
  CASE WHEN p.role = 'mentor' THEN p.instagram_url ELSE NULL END as instagram_url,
  CASE WHEN p.role = 'mentor' THEN p.github_url ELSE NULL END as github_url,
  CASE WHEN p.role = 'mentor' THEN p.website_url ELSE NULL END as website_url
FROM profiles p
WHERE p.role = 'mentor';