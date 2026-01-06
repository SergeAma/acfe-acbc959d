-- Create institution_moderators table
-- Moderators have limited admin access within their institution only
CREATE TABLE public.institution_moderators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(institution_id, user_id)
);

-- Enable RLS
ALTER TABLE public.institution_moderators ENABLE ROW LEVEL SECURITY;

-- Admins can manage all moderators
CREATE POLICY "Admins can manage institution moderators"
ON public.institution_moderators
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Moderators can view their own moderator records
CREATE POLICY "Moderators can view own record"
ON public.institution_moderators
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create institution_broadcasts table for moderator broadcast messages
CREATE TABLE public.institution_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  sent_by uuid NOT NULL REFERENCES auth.users(id),
  sent_at timestamptz DEFAULT now(),
  recipient_count int DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.institution_broadcasts ENABLE ROW LEVEL SECURITY;

-- Admins can manage all broadcasts
CREATE POLICY "Admins can manage institution broadcasts"
ON public.institution_broadcasts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Moderators can manage broadcasts for their institution
CREATE POLICY "Moderators can manage their institution broadcasts"
ON public.institution_broadcasts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.institution_moderators im
    WHERE im.institution_id = institution_broadcasts.institution_id
    AND im.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institution_moderators im
    WHERE im.institution_id = institution_broadcasts.institution_id
    AND im.user_id = auth.uid()
  )
);

-- Create institution_reminders table
CREATE TABLE public.institution_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  reminder_date date NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  is_completed boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.institution_reminders ENABLE ROW LEVEL SECURITY;

-- Admins can manage all reminders
CREATE POLICY "Admins can manage institution reminders"
ON public.institution_reminders
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Moderators can manage reminders for their institution
CREATE POLICY "Moderators can manage their institution reminders"
ON public.institution_reminders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.institution_moderators im
    WHERE im.institution_id = institution_reminders.institution_id
    AND im.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institution_moderators im
    WHERE im.institution_id = institution_reminders.institution_id
    AND im.user_id = auth.uid()
  )
);

-- Function to check if user is moderator for an institution
CREATE OR REPLACE FUNCTION public.is_institution_moderator(_institution_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_moderators
    WHERE institution_id = _institution_id
      AND user_id = _user_id
  )
$$;

-- Add RLS policies for institution_students to allow moderators to manage students
CREATE POLICY "Moderators can view their institution students"
ON public.institution_students
FOR SELECT
TO authenticated
USING (
  public.is_institution_moderator(institution_id, auth.uid())
);

CREATE POLICY "Moderators can insert their institution students"
ON public.institution_students
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_institution_moderator(institution_id, auth.uid())
);

CREATE POLICY "Moderators can update their institution students"
ON public.institution_students
FOR UPDATE
TO authenticated
USING (
  public.is_institution_moderator(institution_id, auth.uid())
);

-- Allow moderators to view institution events
CREATE POLICY "Moderators can view their institution events"
ON public.institution_events
FOR SELECT
TO authenticated
USING (
  public.is_institution_moderator(institution_id, auth.uid())
);

-- Allow moderators to view institution announcements
CREATE POLICY "Moderators can view their institution announcements"
ON public.institution_announcements
FOR SELECT
TO authenticated
USING (
  public.is_institution_moderator(institution_id, auth.uid())
);

-- Allow moderators to view their institution details
CREATE POLICY "Moderators can view their institution"
ON public.institutions
FOR SELECT
TO authenticated
USING (
  public.is_institution_moderator(id, auth.uid())
);