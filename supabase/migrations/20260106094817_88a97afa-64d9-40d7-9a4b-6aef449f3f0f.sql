-- Create mentor contracts table to store contract acceptances
CREATE TABLE public.mentor_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Individual condition acceptances (all must be true)
  condition_respect_students BOOLEAN NOT NULL DEFAULT FALSE,
  condition_free_courses BOOLEAN NOT NULL DEFAULT FALSE,
  condition_session_pricing BOOLEAN NOT NULL DEFAULT FALSE,
  condition_minimum_courses BOOLEAN NOT NULL DEFAULT FALSE,
  condition_quarterly_events BOOLEAN NOT NULL DEFAULT FALSE,
  condition_data_privacy BOOLEAN NOT NULL DEFAULT FALSE,
  condition_monthly_meetings BOOLEAN NOT NULL DEFAULT FALSE,
  condition_support_youth BOOLEAN NOT NULL DEFAULT FALSE,
  condition_no_profanity BOOLEAN NOT NULL DEFAULT FALSE,
  condition_platform_engagement BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Digital signature
  signature_name TEXT NOT NULL,
  signature_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contract metadata
  contract_version TEXT NOT NULL DEFAULT '1.0',
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(mentor_id)
);

-- Enable RLS
ALTER TABLE public.mentor_contracts ENABLE ROW LEVEL SECURITY;

-- Mentors can view their own contract
CREATE POLICY "Mentors can view own contract"
ON public.mentor_contracts
FOR SELECT
USING (auth.uid() = mentor_id);

-- Mentors can insert their own contract (once)
CREATE POLICY "Mentors can sign contract"
ON public.mentor_contracts
FOR INSERT
WITH CHECK (auth.uid() = mentor_id);

-- Admins can view all contracts
CREATE POLICY "Admins can view all contracts"
ON public.mentor_contracts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to check if mentor has signed contract
CREATE OR REPLACE FUNCTION public.has_signed_mentor_contract(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_contracts
    WHERE mentor_id = _user_id
      AND condition_respect_students = TRUE
      AND condition_free_courses = TRUE
      AND condition_session_pricing = TRUE
      AND condition_minimum_courses = TRUE
      AND condition_quarterly_events = TRUE
      AND condition_data_privacy = TRUE
      AND condition_monthly_meetings = TRUE
      AND condition_support_youth = TRUE
      AND condition_no_profanity = TRUE
      AND condition_platform_engagement = TRUE
  )
$$;