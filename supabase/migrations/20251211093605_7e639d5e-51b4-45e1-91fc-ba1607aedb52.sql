-- Add companies_worked_for column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN companies_worked_for text[] DEFAULT '{}';