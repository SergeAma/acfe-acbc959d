-- Drop the existing policy that uses a subquery (potential security concern)
DROP POLICY IF EXISTS "Users can view own submissions" ON public.idea_submissions;

-- Create a security definer function to safely check if user owns submission
CREATE OR REPLACE FUNCTION public.user_owns_idea_submission(_user_id uuid, _submission_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND email = _submission_email
  )
$$;

-- Create a more secure policy using the security definer function
CREATE POLICY "Users can view own submissions"
ON public.idea_submissions
FOR SELECT
USING (
  public.user_owns_idea_submission(auth.uid(), email)
);