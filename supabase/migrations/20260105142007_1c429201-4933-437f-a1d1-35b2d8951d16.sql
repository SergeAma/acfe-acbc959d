-- Add institution exclusivity to courses
ALTER TABLE public.courses 
ADD COLUMN institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_courses_institution_id ON public.courses(institution_id);

-- Add comment for clarity
COMMENT ON COLUMN public.courses.institution_id IS 'If set, course is exclusive to this institution. NULL means available to all ACFE learners.';