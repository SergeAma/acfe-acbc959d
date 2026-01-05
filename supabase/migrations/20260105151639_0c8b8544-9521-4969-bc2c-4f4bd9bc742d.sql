-- Drop the problematic policy
DROP POLICY IF EXISTS "View institution students" ON public.institution_students;

-- Create a security definer function to check membership without recursion
CREATE OR REPLACE FUNCTION public.is_institution_member_direct(_user_id uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_students
    WHERE user_id = _user_id
      AND institution_id = _institution_id
      AND status = 'active'
  )
$$;

-- Create new SELECT policy that avoids recursion by using security definer function
CREATE POLICY "View institution students"
ON public.institution_students
FOR SELECT
USING (
  -- Admins can see all
  has_role(auth.uid(), 'admin'::app_role)
  -- Users can see their own record
  OR user_id = auth.uid()
  -- Members can see other students in their institution (via function to avoid recursion)
  OR is_institution_member_direct(auth.uid(), institution_id)
);