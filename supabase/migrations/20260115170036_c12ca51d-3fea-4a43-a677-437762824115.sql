-- Add gender column to profiles table for learner/mentor signup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;

-- Add gender column to idea_submissions table for startup signup
ALTER TABLE public.idea_submissions ADD COLUMN IF NOT EXISTS gender text;

-- Add gender column to mentorship_requests table for mentee applications
ALTER TABLE public.mentorship_requests ADD COLUMN IF NOT EXISTS gender text;