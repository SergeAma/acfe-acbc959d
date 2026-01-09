-- Add review_mentor_request action type to is_notification_action_completed function
CREATE OR REPLACE FUNCTION public.is_notification_action_completed(_action_type text, _action_reference_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    
    -- Admin: review mentor role request
    WHEN 'review_mentor_request' THEN
      RETURN EXISTS (
        SELECT 1 FROM mentor_role_requests 
        WHERE id = _action_reference_id AND status != 'pending'
      );
    
    -- Info notifications are never "completed" - they just expire naturally
    WHEN 'info' THEN
      RETURN false;
    
    ELSE
      RETURN false;
  END CASE;
END;
$function$;