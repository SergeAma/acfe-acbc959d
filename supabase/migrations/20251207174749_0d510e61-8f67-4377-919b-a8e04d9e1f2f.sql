-- Create course_prerequisites table to track prerequisite relationships
CREATE TABLE public.course_prerequisites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, prerequisite_course_id),
  CHECK (course_id != prerequisite_course_id)
);

-- Create course_certificates table to track earned certificates
CREATE TABLE public.course_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  certificate_number TEXT NOT NULL UNIQUE,
  UNIQUE(enrollment_id)
);

-- Enable RLS on both tables
ALTER TABLE public.course_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

-- RLS policies for course_prerequisites
CREATE POLICY "Anyone can view prerequisites of published courses"
ON public.course_prerequisites
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses c
  WHERE c.id = course_prerequisites.course_id
  AND (c.is_published = true OR c.mentor_id = auth.uid())
));

CREATE POLICY "Mentors can manage prerequisites for own courses"
ON public.course_prerequisites
FOR ALL
USING (EXISTS (
  SELECT 1 FROM courses c
  WHERE c.id = course_prerequisites.course_id
  AND c.mentor_id = auth.uid()
));

-- RLS policies for course_certificates
CREATE POLICY "Students can view own certificates"
ON public.course_certificates
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Mentors can view certificates for their courses"
ON public.course_certificates
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses c
  WHERE c.id = course_certificates.course_id
  AND c.mentor_id = auth.uid()
));

CREATE POLICY "System can insert certificates"
ON public.course_certificates
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Add certificate_enabled flag to courses
ALTER TABLE public.courses ADD COLUMN certificate_enabled BOOLEAN DEFAULT true;