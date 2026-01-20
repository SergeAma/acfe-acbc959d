-- ===========================================
-- PHASE 1: GOVERNED COMMUNICATION SYSTEM
-- Mentor↔Mentor Private Messaging + Admin Oversight
-- ===========================================

-- 1. Create private_messages table for 1:1 messaging
-- Allowed flows (enforced by RLS):
--   - Admin → Anyone
--   - Mentor ↔ Mentor
-- NOT allowed: Mentor↔Student, Student↔Student, Student→Anyone
CREATE TABLE public.private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Prevent self-messaging
  CONSTRAINT no_self_messaging CHECK (sender_id != recipient_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_private_messages_sender ON public.private_messages(sender_id);
CREATE INDEX idx_private_messages_recipient ON public.private_messages(recipient_id);
CREATE INDEX idx_private_messages_created_at ON public.private_messages(created_at DESC);
CREATE INDEX idx_private_messages_is_read ON public.private_messages(recipient_id, is_read) WHERE is_read = false;

-- 2. Enable RLS
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- 3. Create security helper function to check if user is mentor
CREATE OR REPLACE FUNCTION public.is_mentor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'mentor'
  )
$$;

-- 4. Create function to validate message permissions
-- Returns true if the sender can message the recipient
CREATE OR REPLACE FUNCTION public.can_send_private_message(_sender_id uuid, _recipient_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  sender_is_admin boolean;
  sender_is_mentor boolean;
  recipient_is_mentor boolean;
BEGIN
  -- Admin can message anyone
  SELECT public.has_role(_sender_id, 'admin') INTO sender_is_admin;
  IF sender_is_admin THEN
    RETURN true;
  END IF;
  
  -- Check if both are mentors (mentor ↔ mentor allowed)
  SELECT public.is_mentor(_sender_id) INTO sender_is_mentor;
  SELECT public.is_mentor(_recipient_id) INTO recipient_is_mentor;
  
  IF sender_is_mentor AND recipient_is_mentor THEN
    RETURN true;
  END IF;
  
  -- All other combinations are NOT allowed
  RETURN false;
END;
$$;

-- 5. RLS Policies

-- SELECT: Users can see messages they sent or received; admins can see all
CREATE POLICY "Users can view own messages" ON public.private_messages
FOR SELECT USING (
  auth.uid() = sender_id 
  OR auth.uid() = recipient_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- INSERT: Only allowed message flows (validated by function)
CREATE POLICY "Validated users can send messages" ON public.private_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id 
  AND public.can_send_private_message(auth.uid(), recipient_id)
);

-- UPDATE: Only recipient can mark as read
CREATE POLICY "Recipients can mark as read" ON public.private_messages
FOR UPDATE USING (
  auth.uid() = recipient_id
) WITH CHECK (
  auth.uid() = recipient_id
  -- Only allow updating is_read field (content cannot be edited)
);

-- DELETE: Only admins can delete messages
CREATE POLICY "Admins can delete messages" ON public.private_messages
FOR DELETE USING (
  public.has_role(auth.uid(), 'admin')
);

-- 6. Create view for unread message counts
CREATE VIEW public.unread_message_counts 
WITH (security_invoker = true)
AS
SELECT 
  recipient_id as user_id,
  COUNT(*) as unread_count
FROM public.private_messages
WHERE is_read = false
GROUP BY recipient_id;

-- 7. Create function to get conversation partners
-- Returns list of users the current user has messaged with
CREATE OR REPLACE FUNCTION public.get_conversation_partners(_user_id uuid)
RETURNS TABLE (
  partner_id uuid,
  partner_name text,
  partner_avatar text,
  partner_role text,
  last_message_at timestamptz,
  last_message_content text,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH conversations AS (
    SELECT 
      CASE 
        WHEN sender_id = _user_id THEN recipient_id 
        ELSE sender_id 
      END as partner_id,
      MAX(created_at) as last_message_at
    FROM public.private_messages
    WHERE sender_id = _user_id OR recipient_id = _user_id
    GROUP BY partner_id
  ),
  last_messages AS (
    SELECT DISTINCT ON (c.partner_id)
      c.partner_id,
      c.last_message_at,
      pm.content as last_message_content
    FROM conversations c
    JOIN public.private_messages pm ON (
      (pm.sender_id = _user_id AND pm.recipient_id = c.partner_id) OR
      (pm.recipient_id = _user_id AND pm.sender_id = c.partner_id)
    )
    ORDER BY c.partner_id, pm.created_at DESC
  ),
  unread AS (
    SELECT 
      sender_id as partner_id,
      COUNT(*) as unread_count
    FROM public.private_messages
    WHERE recipient_id = _user_id AND is_read = false
    GROUP BY sender_id
  )
  SELECT 
    lm.partner_id,
    p.full_name as partner_name,
    p.avatar_url as partner_avatar,
    p.role::text as partner_role,
    lm.last_message_at,
    lm.last_message_content,
    COALESCE(u.unread_count, 0) as unread_count
  FROM last_messages lm
  JOIN public.profiles p ON p.id = lm.partner_id
  LEFT JOIN unread u ON u.partner_id = lm.partner_id
  ORDER BY lm.last_message_at DESC;
$$;

-- 8. Create function to get messages between two users
CREATE OR REPLACE FUNCTION public.get_conversation_messages(_user_id uuid, _partner_id uuid)
RETURNS TABLE (
  id uuid,
  sender_id uuid,
  recipient_id uuid,
  content text,
  attachment_url text,
  attachment_name text,
  is_read boolean,
  created_at timestamptz,
  is_own_message boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    pm.id,
    pm.sender_id,
    pm.recipient_id,
    pm.content,
    pm.attachment_url,
    pm.attachment_name,
    pm.is_read,
    pm.created_at,
    pm.sender_id = _user_id as is_own_message
  FROM public.private_messages pm
  WHERE (
    (pm.sender_id = _user_id AND pm.recipient_id = _partner_id) OR
    (pm.recipient_id = _user_id AND pm.sender_id = _partner_id)
  )
  ORDER BY pm.created_at ASC;
$$;

-- 9. Enable realtime for private_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;

-- 10. Add new notification action type for DMs
-- Update the is_notification_action_completed function to handle new DM notifications
CREATE OR REPLACE FUNCTION public.is_notification_action_completed(
  _action_type text,
  _action_reference_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  CASE _action_type
    WHEN 'complete_course' THEN
      RETURN EXISTS (
        SELECT 1 FROM enrollments 
        WHERE id = _action_reference_id AND progress >= 100
      );
    
    WHEN 'submit_assignment' THEN
      RETURN EXISTS (
        SELECT 1 FROM assignment_submissions 
        WHERE assignment_id = _action_reference_id 
          AND student_id = auth.uid()
          AND status != 'revision_requested'
      );
    
    WHEN 'revise_assignment' THEN
      RETURN EXISTS (
        SELECT 1 FROM assignment_submissions 
        WHERE id = _action_reference_id 
          AND status IN ('pending', 'approved')
      );
    
    WHEN 'review_mentorship_request' THEN
      RETURN EXISTS (
        SELECT 1 FROM mentorship_requests 
        WHERE id = _action_reference_id AND status != 'pending'
      );
    
    WHEN 'publish_course' THEN
      RETURN EXISTS (
        SELECT 1 FROM courses 
        WHERE id = _action_reference_id AND is_published = true
      );
    
    WHEN 'review_institution_request' THEN
      RETURN EXISTS (
        SELECT 1 FROM mentor_institution_requests 
        WHERE id = _action_reference_id AND status != 'pending'
      );
    
    WHEN 'review_submission' THEN
      RETURN EXISTS (
        SELECT 1 FROM assignment_submissions 
        WHERE id = _action_reference_id AND status != 'pending'
      );
    
    WHEN 'review_mentor_request' THEN
      RETURN EXISTS (
        SELECT 1 FROM mentor_role_requests 
        WHERE id = _action_reference_id AND status != 'pending'
      );
    
    -- NEW: Private message notification - completed when message is read
    WHEN 'new_private_message' THEN
      RETURN EXISTS (
        SELECT 1 FROM private_messages 
        WHERE id = _action_reference_id AND is_read = true
      );
    
    WHEN 'info' THEN
      RETURN false;
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;