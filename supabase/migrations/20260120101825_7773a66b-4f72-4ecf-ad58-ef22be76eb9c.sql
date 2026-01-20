-- =====================================================
-- PHASE 2: ADMIN BROADCAST SYSTEM + MESSAGES OVERSIGHT
-- =====================================================

-- Admin Broadcasts table for tracking sent broadcasts
CREATE TABLE public.admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT NOT NULL CHECK (target_role IN ('mentor', 'student', 'all')),
  filters JSONB DEFAULT '{}',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Broadcast recipients for audit trail
CREATE TABLE public.broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.admin_broadcasts(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(broadcast_id, recipient_id)
);

-- Create indexes for performance
CREATE INDEX idx_broadcast_recipients_broadcast_id ON public.broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_recipient_id ON public.broadcast_recipients(recipient_id);
CREATE INDEX idx_admin_broadcasts_created_at ON public.admin_broadcasts(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_broadcasts (admin only)
CREATE POLICY "Admins can do everything with broadcasts"
ON public.admin_broadcasts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for broadcast_recipients (admin only)
CREATE POLICY "Admins can do everything with broadcast recipients"
ON public.broadcast_recipients
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to get filtered recipients for broadcast
CREATE OR REPLACE FUNCTION public.get_broadcast_recipients(
  _target_role TEXT,
  _country TEXT DEFAULT NULL,
  _language TEXT DEFAULT NULL,
  _gender TEXT DEFAULT NULL,
  _skills TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  country TEXT,
  preferred_language TEXT,
  gender TEXT,
  skills TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.country,
    p.preferred_language,
    p.gender,
    p.skills
  FROM public.profiles p
  WHERE 
    -- Filter by role
    CASE 
      WHEN _target_role = 'mentor' THEN p.role = 'mentor'::user_role
      WHEN _target_role = 'student' THEN p.role = 'student'::user_role
      ELSE TRUE
    END
    -- Filter by country (if specified)
    AND (_country IS NULL OR p.country = _country)
    -- Filter by language (if specified)
    AND (_language IS NULL OR p.preferred_language = _language)
    -- Filter by gender (if specified)
    AND (_gender IS NULL OR p.gender = _gender)
    -- Filter by skills (if specified - any match)
    AND (_skills IS NULL OR p.skills && _skills)
    -- Only active accounts
    AND (p.account_status IS NULL OR p.account_status = 'active')
    -- Must have email
    AND p.email IS NOT NULL;
END;
$$;

-- Add comment for documentation
COMMENT ON TABLE public.admin_broadcasts IS 'Stores admin broadcast messages sent to mentors/students';
COMMENT ON TABLE public.broadcast_recipients IS 'Audit trail of broadcast recipients';
COMMENT ON FUNCTION public.get_broadcast_recipients IS 'Returns filtered list of recipients for admin broadcasts';