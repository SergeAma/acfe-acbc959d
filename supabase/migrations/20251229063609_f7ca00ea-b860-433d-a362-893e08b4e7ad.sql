-- Add DELETE policy so students can unenroll from courses
CREATE POLICY "Students can unenroll from courses"
ON public.enrollments
FOR DELETE
USING (auth.uid() = student_id);

-- Add live course fields to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS live_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS live_platform text,
ADD COLUMN IF NOT EXISTS live_url text,
ADD COLUMN IF NOT EXISTS registration_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS recording_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.courses.is_live IS 'Whether this is a live course that requires registration';
COMMENT ON COLUMN public.courses.live_date IS 'The date and time when the live session occurs';
COMMENT ON COLUMN public.courses.live_platform IS 'Platform used for live session (zoom, google_meet, webex, etc.)';
COMMENT ON COLUMN public.courses.live_url IS 'The meeting URL for the live session';
COMMENT ON COLUMN public.courses.registration_deadline IS 'Deadline for registrations';
COMMENT ON COLUMN public.courses.recording_url IS 'URL to the recording after the live session';