-- Add campaign_name column to email_logs for mass-mailer tracking
-- This allows distinguishing between newsletter sends and partnership e-blasts
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS campaign_name TEXT;