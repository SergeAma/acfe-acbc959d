-- Add university/institution field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS university TEXT;