-- Function to claim pending institution invitation by matching email
CREATE OR REPLACE FUNCTION public.claim_institution_invitation(_user_id uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_email text;
  _claimed boolean := false;
BEGIN
  -- Get the user's email from their profile
  SELECT email INTO _user_email
  FROM public.profiles
  WHERE id = _user_id;
  
  IF _user_email IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update any pending invitation that matches this email
  UPDATE public.institution_students
  SET 
    user_id = _user_id,
    status = 'active',
    joined_at = now()
  WHERE institution_id = _institution_id
    AND LOWER(email) = LOWER(_user_email)
    AND status = 'pending'
    AND user_id IS NULL;
  
  -- Check if we updated any rows
  IF FOUND THEN
    _claimed := true;
  END IF;
  
  RETURN _claimed;
END;
$$;