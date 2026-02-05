-- Create event_mentors junction table for registered ACFE mentors participating in events
CREATE TABLE public.event_mentors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, mentor_id)
);

-- Enable RLS
ALTER TABLE public.event_mentors ENABLE ROW LEVEL SECURITY;

-- Public can view event mentors
CREATE POLICY "Event mentors are viewable by everyone"
ON public.event_mentors
FOR SELECT
USING (true);

-- Only admins can manage event mentors
CREATE POLICY "Admins can manage event mentors"
ON public.event_mentors
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));