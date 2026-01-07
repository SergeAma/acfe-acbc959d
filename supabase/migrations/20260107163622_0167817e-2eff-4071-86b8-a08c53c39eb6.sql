-- Update get_public_mentor_profiles to only return mentors with complete profiles
CREATE OR REPLACE FUNCTION public.get_public_mentor_profiles()
 RETURNS TABLE(id uuid, full_name text, bio text, avatar_url text, profile_frame text, role text, linkedin_url text, twitter_url text, instagram_url text, github_url text, website_url text, companies_worked_for text[], skills text[])
 LANGUAGE sql
 SECURITY DEFINER
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
    p.companies_worked_for,
    p.skills
  FROM public.profiles p
  WHERE p.role = 'mentor'::user_role
    AND p.account_status = 'active'
    -- Bio is required and non-empty
    AND p.bio IS NOT NULL 
    AND TRIM(p.bio) != ''
    -- At least 1 social link
    AND (
      (p.linkedin_url IS NOT NULL AND TRIM(p.linkedin_url) != '') OR
      (p.twitter_url IS NOT NULL AND TRIM(p.twitter_url) != '') OR
      (p.instagram_url IS NOT NULL AND TRIM(p.instagram_url) != '') OR
      (p.github_url IS NOT NULL AND TRIM(p.github_url) != '') OR
      (p.website_url IS NOT NULL AND TRIM(p.website_url) != '')
    )
    -- At least 1 company worked with
    AND p.companies_worked_for IS NOT NULL 
    AND array_length(p.companies_worked_for, 1) >= 1
    -- At least 3 skills
    AND p.skills IS NOT NULL 
    AND array_length(p.skills, 1) >= 3;
$function$;

-- Update get_public_mentor_profile to enforce same requirements for individual profiles
CREATE OR REPLACE FUNCTION public.get_public_mentor_profile(mentor_id uuid)
 RETURNS TABLE(id uuid, full_name text, bio text, avatar_url text, profile_frame text, role text, linkedin_url text, twitter_url text, instagram_url text, github_url text, website_url text, companies_worked_for text[], skills text[])
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
    p.companies_worked_for,
    p.skills
  FROM public.profiles p
  WHERE p.id = mentor_id 
    AND p.role = 'mentor'::user_role
    AND p.account_status = 'active'
    -- Bio is required and non-empty
    AND p.bio IS NOT NULL 
    AND TRIM(p.bio) != ''
    -- At least 1 social link
    AND (
      (p.linkedin_url IS NOT NULL AND TRIM(p.linkedin_url) != '') OR
      (p.twitter_url IS NOT NULL AND TRIM(p.twitter_url) != '') OR
      (p.instagram_url IS NOT NULL AND TRIM(p.instagram_url) != '') OR
      (p.github_url IS NOT NULL AND TRIM(p.github_url) != '') OR
      (p.website_url IS NOT NULL AND TRIM(p.website_url) != '')
    )
    -- At least 1 company worked with
    AND p.companies_worked_for IS NOT NULL 
    AND array_length(p.companies_worked_for, 1) >= 1
    -- At least 3 skills
    AND p.skills IS NOT NULL 
    AND array_length(p.skills, 1) >= 3;
$function$;