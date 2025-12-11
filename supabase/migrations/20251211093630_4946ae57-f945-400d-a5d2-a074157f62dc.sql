-- Recreate get_public_mentor_profiles with companies_worked_for
CREATE FUNCTION public.get_public_mentor_profiles()
 RETURNS TABLE(id uuid, full_name text, bio text, avatar_url text, profile_frame text, role text, linkedin_url text, twitter_url text, instagram_url text, github_url text, website_url text, companies_worked_for text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    p.companies_worked_for
  FROM public.profiles p
  WHERE p.role = 'mentor'::user_role;
$function$;

-- Recreate get_public_mentor_profile with companies_worked_for
CREATE FUNCTION public.get_public_mentor_profile(mentor_id uuid)
 RETURNS TABLE(id uuid, full_name text, bio text, avatar_url text, profile_frame text, role text, linkedin_url text, twitter_url text, instagram_url text, github_url text, website_url text, companies_worked_for text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    p.companies_worked_for
  FROM public.profiles p
  WHERE p.id = mentor_id AND p.role = 'mentor'::user_role;
$function$;