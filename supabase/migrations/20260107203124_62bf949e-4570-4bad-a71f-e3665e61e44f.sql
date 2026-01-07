-- Modify notifications table to support action-based notifications
-- Drop is_read column (no longer needed - completion is action-based)
ALTER TABLE public.notifications DROP COLUMN IF EXISTS is_read;

-- Add action tracking columns
ALTER TABLE public.notifications 
  ADD COLUMN action_type text NOT NULL DEFAULT 'info',
  ADD COLUMN action_reference_id uuid NULL;

-- Add index for efficient querying
CREATE INDEX idx_notifications_action ON public.notifications(user_id, action_type, action_reference_id);

-- Create function to check if a notification action is completed
CREATE OR REPLACE FUNCTION public.is_notification_action_completed(
  _action_type text,
  _action_reference_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Handle different action types
  CASE _action_type
    -- Student: complete a course (enrollment reaches 100%)
    WHEN 'complete_course' THEN
      RETURN EXISTS (
        SELECT 1 FROM enrollments 
        WHERE id = _action_reference_id AND progress >= 100
      );
    
    -- Student: submit an assignment
    WHEN 'submit_assignment' THEN
      RETURN EXISTS (
        SELECT 1 FROM assignment_submissions 
        WHERE assignment_id = _action_reference_id 
          AND student_id = auth.uid()
          AND status != 'revision_requested'
      );
    
    -- Student: revise a rejected assignment
    WHEN 'revise_assignment' THEN
      RETURN EXISTS (
        SELECT 1 FROM assignment_submissions 
        WHERE id = _action_reference_id 
          AND status IN ('pending', 'approved')
      );
    
    -- Mentor: review a mentorship request
    WHEN 'review_mentorship_request' THEN
      RETURN EXISTS (
        SELECT 1 FROM mentorship_requests 
        WHERE id = _action_reference_id AND status != 'pending'
      );
    
    -- Mentor: publish a course
    WHEN 'publish_course' THEN
      RETURN EXISTS (
        SELECT 1 FROM courses 
        WHERE id = _action_reference_id AND is_published = true
      );
    
    -- Admin: review institution request
    WHEN 'review_institution_request' THEN
      RETURN EXISTS (
        SELECT 1 FROM mentor_institution_requests 
        WHERE id = _action_reference_id AND status != 'pending'
      );
    
    -- Mentor: review assignment submission
    WHEN 'review_submission' THEN
      RETURN EXISTS (
        SELECT 1 FROM assignment_submissions 
        WHERE id = _action_reference_id AND status != 'pending'
      );
    
    -- Info notifications are never "completed" - they just expire naturally
    WHEN 'info' THEN
      RETURN false;
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Create view for pending (incomplete) notifications
CREATE OR REPLACE VIEW public.pending_notifications AS
SELECT 
  n.id,
  n.user_id,
  n.message,
  n.link,
  n.action_type,
  n.action_reference_id,
  n.created_at
FROM public.notifications n
WHERE NOT public.is_notification_action_completed(n.action_type, n.action_reference_id);

-- Grant access to the view
GRANT SELECT ON public.pending_notifications TO authenticated;

-- Update RLS policies for notifications (keep existing SELECT, INSERT policies)
-- Remove the mark as read policy since is_read no longer exists
DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON public.notifications;

-- Add policy allowing deletion when action is completed
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" 
  ON public.notifications 
  FOR DELETE 
  USING (auth.uid() = user_id);