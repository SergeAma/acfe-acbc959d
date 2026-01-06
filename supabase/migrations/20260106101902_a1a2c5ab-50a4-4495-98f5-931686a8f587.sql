-- Create learner_agreements table to store learner agreement signatures
CREATE TABLE public.learner_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  condition_good_conduct BOOLEAN NOT NULL DEFAULT FALSE,
  condition_zero_tolerance BOOLEAN NOT NULL DEFAULT FALSE,
  condition_respect_privacy BOOLEAN NOT NULL DEFAULT FALSE,
  condition_no_liability_behavior BOOLEAN NOT NULL DEFAULT FALSE,
  condition_no_liability_external BOOLEAN NOT NULL DEFAULT FALSE,
  condition_promotional_rights BOOLEAN NOT NULL DEFAULT FALSE,
  condition_non_refundable BOOLEAN NOT NULL DEFAULT FALSE,
  condition_no_sharing BOOLEAN NOT NULL DEFAULT FALSE,
  signature_name TEXT NOT NULL,
  signature_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT,
  agreement_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.learner_agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own agreement"
  ON public.learner_agreements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agreement"
  ON public.learner_agreements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all agreements
CREATE POLICY "Admins can view all agreements"
  ON public.learner_agreements
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to check if user has signed learner agreement
CREATE OR REPLACE FUNCTION public.has_signed_learner_agreement(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.learner_agreements
    WHERE user_id = _user_id
      AND condition_good_conduct = TRUE
      AND condition_zero_tolerance = TRUE
      AND condition_respect_privacy = TRUE
      AND condition_no_liability_behavior = TRUE
      AND condition_no_liability_external = TRUE
      AND condition_promotional_rights = TRUE
      AND condition_non_refundable = TRUE
      AND condition_no_sharing = TRUE
  )
$$;

-- Add promotional rights condition to mentor_contracts table
ALTER TABLE public.mentor_contracts
ADD COLUMN IF NOT EXISTS condition_promotional_rights BOOLEAN NOT NULL DEFAULT FALSE;