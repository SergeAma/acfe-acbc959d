-- Add account_status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active' 
CHECK (account_status IN ('active', 'paused', 'deleted'));

-- Add scheduled_deletion_at column for soft delete
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on account status
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);