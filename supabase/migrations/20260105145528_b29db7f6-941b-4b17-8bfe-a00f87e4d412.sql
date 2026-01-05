-- Fix RLS policies on institution_students to properly allow admin access
-- The issue is that there are two restrictive SELECT policies and BOTH must pass

-- Drop the existing conflicting policies
DROP POLICY IF EXISTS "Admins can manage institution students" ON public.institution_students;
DROP POLICY IF EXISTS "Members can view their institution's students" ON public.institution_students;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.institution_students;

-- Create a single SELECT policy that handles all cases
CREATE POLICY "View institution students" 
ON public.institution_students 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR user_id = auth.uid() 
  OR (EXISTS (
    SELECT 1 FROM institution_students s
    WHERE s.institution_id = institution_students.institution_id
      AND s.user_id = auth.uid()
      AND s.status = 'active'::text
  ))
);

-- Admin can insert
CREATE POLICY "Admins can insert institution students" 
ON public.institution_students 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update any, users can update their own
CREATE POLICY "Update institution students" 
ON public.institution_students 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

-- Admin can delete
CREATE POLICY "Admins can delete institution students" 
ON public.institution_students 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));