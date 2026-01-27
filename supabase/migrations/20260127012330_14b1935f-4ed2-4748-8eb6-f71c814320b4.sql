-- Fix: Allow admins to view ALL courses (including drafts from other mentors)
CREATE POLICY "Admins can view all courses"
ON public.courses
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Fix: Allow admins to update ALL courses
CREATE POLICY "Admins can update all courses"
ON public.courses
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Fix: Allow admins to delete ALL courses
CREATE POLICY "Admins can delete all courses"
ON public.courses
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Fix: Allow admins to view ALL course sections
CREATE POLICY "Admins can view all sections"
ON public.course_sections
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Fix: Allow admins to view ALL course content (lessons)
CREATE POLICY "Admins can view all content"
ON public.course_content
FOR SELECT
USING (has_role(auth.uid(), 'admin'));