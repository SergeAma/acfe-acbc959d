-- Trigger function to auto-claim institution invitations when a new user registers
CREATE OR REPLACE FUNCTION public.auto_claim_institution_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update any pending institution invitations that match this user's email
  UPDATE public.institution_students
  SET 
    user_id = NEW.id,
    status = 'active',
    joined_at = now()
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (fires after handle_new_user creates the profile)
DROP TRIGGER IF EXISTS on_profile_created_claim_invitations ON public.profiles;
CREATE TRIGGER on_profile_created_claim_invitations
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_claim_institution_invitations();