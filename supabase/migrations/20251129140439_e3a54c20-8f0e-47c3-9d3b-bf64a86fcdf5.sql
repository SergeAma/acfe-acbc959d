-- Drop the existing insecure public view
DROP VIEW IF EXISTS public.profiles_public;

-- Drop the overly permissive RLS policy on profiles
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create a strict RLS policy: users can ONLY view their own profile
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create a minimal public view that ONLY shows mentor names for discovery
-- No email, bio, country, avatar_url, or other PII
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  full_name,
  role
FROM public.profiles
WHERE role = 'mentor';

-- Enable RLS on the view
ALTER VIEW public.profiles_public SET (security_invoker = true);

-- Grant access to authenticated users only (NOT anonymous)
GRANT SELECT ON public.profiles_public TO authenticated;