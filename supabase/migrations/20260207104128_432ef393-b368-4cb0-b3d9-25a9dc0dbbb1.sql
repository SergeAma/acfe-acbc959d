-- Create a secure function to get certificate holder name
-- This is needed because profiles_public only includes mentors
CREATE OR REPLACE FUNCTION public.get_certificate_holder_name(p_student_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name FROM profiles WHERE id = p_student_id;
$$;

-- Grant execute permission to anonymous users (needed for public certificate verification)
GRANT EXECUTE ON FUNCTION public.get_certificate_holder_name(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_certificate_holder_name(uuid) TO authenticated;