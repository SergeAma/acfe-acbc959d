-- Enable pg_net extension for HTTP calls (required for net.http_post)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send welcome email when new user signs up
CREATE OR REPLACE FUNCTION public.send_welcome_email_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_email TEXT;
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Get Supabase URL and service role key from vault or environment
  supabase_url := current_setting('supabase.url', true);
  service_key := current_setting('supabase.service_role_key', true);
  
  -- Fallback to hardcoded URL if setting not available
  IF supabase_url IS NULL THEN
    supabase_url := 'https://mefwbcbnctqjxrwldmjm.supabase.co';
  END IF;
  
  -- Get user details from the NEW profile row
  user_name := COALESCE(NEW.full_name, NEW.email, 'User');
  user_email := NEW.email;
  
  -- Only proceed if we have an email
  IF user_email IS NOT NULL AND service_key IS NOT NULL THEN
    -- Call send-email function asynchronously
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'type', 'welcome',
        'to', user_email,
        'data', jsonb_build_object(
          'userName', user_name,
          'userEmail', user_email
        ),
        'userId', NEW.id::text
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Welcome email trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON public.profiles;

-- Create trigger on profiles table (after user is created)
CREATE TRIGGER on_profile_created_send_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email_on_signup();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.send_welcome_email_on_signup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_welcome_email_on_signup() TO service_role;