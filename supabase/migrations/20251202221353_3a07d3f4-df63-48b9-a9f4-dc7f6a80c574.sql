-- Add profile_frame column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_frame TEXT DEFAULT 'none';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.profile_frame IS 'Frame overlay for profile picture: none, hiring, open_to_work, looking_for_cofounder';