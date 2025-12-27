-- Add pricing fields to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS price_cents integer DEFAULT 1000;

-- Create platform settings table for admin overrides
CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage platform_settings"
ON public.platform_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read platform settings (needed for displaying pricing)
CREATE POLICY "Anyone can read platform_settings"
ON public.platform_settings
FOR SELECT
USING (true);

-- Insert default platform pricing settings
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES 
  ('pricing_override', '{"enabled": false, "force_free": false, "sponsor_name": null, "sponsor_message": null}'::jsonb),
  ('default_course_price_cents', '1000'::jsonb);

-- Create course purchases table
CREATE TABLE public.course_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  purchased_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Enable RLS
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;

-- Students can view own purchases
CREATE POLICY "Students can view own purchases"
ON public.course_purchases
FOR SELECT
USING (auth.uid() = student_id);

-- Students can insert own purchases (for pending state)
CREATE POLICY "Students can create own purchases"
ON public.course_purchases
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Students can update own pending purchases (for completing payment)
CREATE POLICY "Students can update own pending purchases"
ON public.course_purchases
FOR UPDATE
USING (auth.uid() = student_id AND status = 'pending');

-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases"
ON public.course_purchases
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Mentors can view purchases for their courses
CREATE POLICY "Mentors can view purchases for their courses"
ON public.course_purchases
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses c 
  WHERE c.id = course_purchases.course_id 
  AND c.mentor_id = auth.uid()
));