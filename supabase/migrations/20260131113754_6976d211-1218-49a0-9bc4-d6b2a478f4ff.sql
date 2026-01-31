-- Add google_form_url column to course_assignments
-- This allows each course to have a unique Google Form for assignment submissions
ALTER TABLE public.course_assignments 
ADD COLUMN google_form_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.course_assignments.google_form_url IS 'Custom Google Form URL for this course assignment. If null, falls back to legacy default form.';