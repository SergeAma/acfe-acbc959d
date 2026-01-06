-- Add drip_schedule_type column to courses table
-- Options: 'module' (by section), 'week' (weekly releases), 'month' (monthly releases)
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS drip_schedule_type TEXT DEFAULT 'week';

-- Add comment for documentation
COMMENT ON COLUMN public.courses.drip_schedule_type IS 'Drip content schedule type: module, week, or month';