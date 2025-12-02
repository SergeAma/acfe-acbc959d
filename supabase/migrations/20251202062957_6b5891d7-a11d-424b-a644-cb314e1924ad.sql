-- Add drip scheduling fields to courses table
ALTER TABLE public.courses
ADD COLUMN drip_enabled boolean DEFAULT false;

-- Add drip delay to course_content table
ALTER TABLE public.course_content
ADD COLUMN drip_delay_days integer DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.course_content.drip_delay_days IS 'Number of days after enrollment before this content becomes available. 0 means available immediately.';