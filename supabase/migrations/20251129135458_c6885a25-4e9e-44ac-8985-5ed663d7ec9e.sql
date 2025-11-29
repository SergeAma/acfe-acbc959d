-- Create a secure view with conditional email visibility
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  created_at,
  updated_at,
  full_name,
  role,
  bio,
  avatar_url,
  country,
  CASE 
    WHEN auth.uid() = id THEN email 
    ELSE NULL 
  END as email
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.profiles_public SET (security_invoker = true);

-- Grant access to authenticated and anonymous users
GRANT SELECT ON public.profiles_public TO authenticated, anon;