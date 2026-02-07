-- Remove the trigger that fires on profile creation (too early - before email confirmation)
DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON public.profiles;

-- Also drop the function since we'll handle welcome emails from the frontend after email confirmation
DROP FUNCTION IF EXISTS public.send_welcome_email_on_signup();