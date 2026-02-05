-- Create event type enum
CREATE TYPE public.event_type AS ENUM ('online', 'in_person');

-- Create event status enum  
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- Create events table (platform-wide, not institution-scoped)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  event_type event_type NOT NULL DEFAULT 'in_person',
  -- Online event fields
  event_link TEXT,
  -- In-person event fields
  location_name TEXT,
  location_address TEXT,
  -- Email reminder settings (which reminders to send)
  send_5day_reminder BOOLEAN DEFAULT true,
  send_2day_reminder BOOLEAN DEFAULT true,
  send_dayof_reminder BOOLEAN DEFAULT true,
  -- Publishing
  status event_status NOT NULL DEFAULT 'draft',
  featured_image_url TEXT,
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create event speakers table (full profiles)
CREATE TABLE public.event_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  organization TEXT,
  bio TEXT,
  photo_url TEXT,
  linkedin_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create event sponsors table
CREATE TABLE public.event_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create event registrations junction table
CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Email tracking
  confirmation_sent_at TIMESTAMPTZ,
  reminder_5day_sent_at TIMESTAMPTZ,
  reminder_2day_sent_at TIMESTAMPTZ,
  reminder_dayof_sent_at TIMESTAMPTZ,
  -- Unique constraint: one registration per user per event
  UNIQUE(event_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_events_slug ON public.events(slug);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_event_speakers_event ON public.event_speakers(event_id);
CREATE INDEX idx_event_sponsors_event ON public.event_sponsors(event_id);
CREATE INDEX idx_event_registrations_event ON public.event_registrations(event_id);
CREATE INDEX idx_event_registrations_user ON public.event_registrations(user_id);

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events table
-- Anyone can view published events
CREATE POLICY "Anyone can view published events"
  ON public.events FOR SELECT
  USING (status = 'published');

-- Admins can view all events (including drafts)
CREATE POLICY "Admins can view all events"
  ON public.events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert events
CREATE POLICY "Admins can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update events
CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete events
CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for event_speakers (public read, admin write)
CREATE POLICY "Anyone can view event speakers"
  ON public.event_speakers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id AND e.status = 'published'
  ));

CREATE POLICY "Admins can view all speakers"
  ON public.event_speakers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage speakers"
  ON public.event_speakers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for event_sponsors (public read, admin write)
CREATE POLICY "Anyone can view event sponsors"
  ON public.event_sponsors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id AND e.status = 'published'
  ));

CREATE POLICY "Admins can view all sponsors"
  ON public.event_sponsors FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage sponsors"
  ON public.event_sponsors FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for event_registrations
-- Users can view their own registrations
CREATE POLICY "Users can view own registrations"
  ON public.event_registrations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all registrations
CREATE POLICY "Admins can view all registrations"
  ON public.event_registrations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can register for events
CREATE POLICY "Users can register for events"
  ON public.event_registrations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own registrations (unregister)
CREATE POLICY "Users can unregister from events"
  ON public.event_registrations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage all registrations
CREATE POLICY "Admins can manage registrations"
  ON public.event_registrations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_event_slug(title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.events WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;