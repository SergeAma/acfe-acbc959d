-- Create table for tracking individual lesson completion
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.course_content(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(enrollment_id, content_id)
);

-- Enable RLS
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Students can view their own lesson progress
CREATE POLICY "Students can view own lesson progress"
ON public.lesson_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.id = lesson_progress.enrollment_id
    AND enrollments.student_id = auth.uid()
  )
);

-- Students can insert their own lesson progress
CREATE POLICY "Students can insert own lesson progress"
ON public.lesson_progress
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.id = lesson_progress.enrollment_id
    AND enrollments.student_id = auth.uid()
  )
);

-- Students can update their own lesson progress
CREATE POLICY "Students can update own lesson progress"
ON public.lesson_progress
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.id = lesson_progress.enrollment_id
    AND enrollments.student_id = auth.uid()
  )
);

-- Mentors can view lesson progress for their courses
CREATE POLICY "Mentors can view lesson progress for their courses"
ON public.lesson_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = lesson_progress.enrollment_id
    AND c.mentor_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX idx_lesson_progress_enrollment ON public.lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_content ON public.lesson_progress(content_id);

-- Add trigger to update updated_at
CREATE TRIGGER update_lesson_progress_updated_at
BEFORE UPDATE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();