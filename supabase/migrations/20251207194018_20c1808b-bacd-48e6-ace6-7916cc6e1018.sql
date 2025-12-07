-- Create a security definer function to validate invitation tokens
-- Returns only non-sensitive status info, not the full record
CREATE OR REPLACE FUNCTION public.validate_mentor_invitation(_token uuid)
RETURNS TABLE(
  is_valid boolean,
  status text,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN mi.status = 'pending' AND mi.expires_at > now() THEN true
      ELSE false
    END as is_valid,
    mi.status,
    mi.expires_at
  FROM public.mentor_invitations mi
  WHERE mi.token = _token;
END;
$$;

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can check invitations by token" ON public.mentor_invitations;