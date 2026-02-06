-- Allow public/anonymous users to view basic mentor profile info for event pages
-- This is a targeted policy for displaying mentor cards (avatar, name, bio only)
CREATE POLICY "Public can view active mentor profiles"
ON public.profiles
FOR SELECT
USING (
  role = 'mentor'::user_role 
  AND account_status = 'active'
);

-- Add event_image_url column for separate event imagery
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_image_url text;