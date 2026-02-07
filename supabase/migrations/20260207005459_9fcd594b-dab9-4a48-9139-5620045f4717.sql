-- Update the welcome email function to use vault for service role key
CREATE OR REPLACE FUNCTION public.send_welcome_email_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_email TEXT;
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Get Supabase URL (hardcoded since we know it)
  supabase_url := 'https://mefwbcbnctqjxrwldmjm.supabase.co';
  
  -- Get service role key from vault
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;
  
  -- Get user details from the NEW profile row
  user_name := COALESCE(NEW.full_name, NEW.email, 'User');
  user_email := NEW.email;
  
  -- Only proceed if we have an email and service key
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