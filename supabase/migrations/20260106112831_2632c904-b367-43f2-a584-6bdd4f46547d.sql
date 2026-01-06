-- Create referrals table for partner/institution recommendations
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_first_name TEXT NOT NULL,
  referrer_last_name TEXT NOT NULL,
  referrer_email TEXT NOT NULL,
  referrer_company TEXT,
  referred_first_name TEXT NOT NULL,
  referred_last_name TEXT NOT NULL,
  referred_company TEXT NOT NULL,
  referred_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Only admins can view referrals
CREATE POLICY "Admins can view all referrals"
ON public.referrals
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update referrals
CREATE POLICY "Admins can update referrals"
ON public.referrals
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add company and reason columns to donations table
ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Create trigger for updated_at
CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();