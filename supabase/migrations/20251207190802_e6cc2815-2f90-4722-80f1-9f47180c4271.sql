-- Create table for external course prerequisites (courses from other platforms)
CREATE TABLE public.external_course_prerequisites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_course_prerequisites ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view external prerequisites of published courses
CREATE POLICY "Anyone can view external prerequisites of published courses"
ON public.external_course_prerequisites
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses c
  WHERE c.id = external_course_prerequisites.course_id
  AND (c.is_published = true OR c.mentor_id = auth.uid())
));

-- Allow mentors to manage external prerequisites for their own courses
CREATE POLICY "Mentors can manage external prerequisites for own courses"
ON public.external_course_prerequisites
FOR ALL
USING (EXISTS (
  SELECT 1 FROM courses c
  WHERE c.id = external_course_prerequisites.course_id
  AND c.mentor_id = auth.uid()
));