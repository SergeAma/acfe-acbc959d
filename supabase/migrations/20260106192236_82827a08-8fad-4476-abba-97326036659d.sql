ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS drip_release_day INTEGER DEFAULT 3;
COMMENT ON COLUMN public.courses.drip_release_day IS 'Day of week for drip content release: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';