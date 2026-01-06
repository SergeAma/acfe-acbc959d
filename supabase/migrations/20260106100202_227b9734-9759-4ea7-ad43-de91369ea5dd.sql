-- Create platform_moderators table for users who can access all cohorts/forums but aren't full admins
CREATE TABLE public.platform_moderators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.platform_moderators ENABLE ROW LEVEL SECURITY;

-- Only admins can manage platform moderators
CREATE POLICY "Admins can manage platform_moderators"
ON public.platform_moderators
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to check if user is platform moderator
CREATE OR REPLACE FUNCTION public.is_platform_moderator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_moderators
    WHERE user_id = _user_id
  )
$$;

-- Add ACFE TEAM as platform moderator (they'll have access to all cohorts/forums)
INSERT INTO public.platform_moderators (user_id, granted_by)
VALUES ('adc1d74b-23b7-4429-931a-a5bfcdc44a9f', 'adc1d74b-23b7-4429-931a-a5bfcdc44a9f');

-- Change ACFE TEAM from admin to mentor in user_roles
DELETE FROM public.user_roles WHERE user_id = 'adc1d74b-23b7-4429-931a-a5bfcdc44a9f' AND role = 'admin';
INSERT INTO public.user_roles (user_id, role, approved_at)
VALUES ('adc1d74b-23b7-4429-931a-a5bfcdc44a9f', 'mentor'::app_role, now())
ON CONFLICT (user_id, role) DO NOTHING;

-- Update ACFE profile role for backward compatibility
UPDATE public.profiles SET role = 'mentor'::user_role WHERE id = 'adc1d74b-23b7-4429-931a-a5bfcdc44a9f';

-- Update cohort_messages RLS policies to include platform moderators
DROP POLICY IF EXISTS "Admins can view all cohort messages" ON public.cohort_messages;
CREATE POLICY "Admins and platform moderators can view all cohort messages"
ON public.cohort_messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.is_platform_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can post in any cohort" ON public.cohort_messages;
CREATE POLICY "Admins and platform moderators can post in any cohort"
ON public.cohort_messages
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_platform_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can update any cohort message" ON public.cohort_messages;
CREATE POLICY "Admins and platform moderators can update any cohort message"
ON public.cohort_messages
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.is_platform_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete any cohort message" ON public.cohort_messages;
CREATE POLICY "Admins and platform moderators can delete any cohort message"
ON public.cohort_messages
FOR DELETE
USING (public.has_role(auth.uid(), 'admin') OR public.is_platform_moderator(auth.uid()));