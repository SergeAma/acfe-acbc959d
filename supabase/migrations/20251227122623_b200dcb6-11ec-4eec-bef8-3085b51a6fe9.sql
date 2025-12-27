-- Add subscription_id column to course_purchases for recurring payments
ALTER TABLE public.course_purchases 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;