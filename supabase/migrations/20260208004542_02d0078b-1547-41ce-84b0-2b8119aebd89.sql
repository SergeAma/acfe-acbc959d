-- Add welcome email tracking column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;