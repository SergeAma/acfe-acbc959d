-- Institutions table
CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  email_domain text, -- Optional: for auto-matching students by email domain
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Institution students (membership)
CREATE TABLE public.institution_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  invited_by uuid, -- admin who invited
  UNIQUE(institution_id, email)
);

-- Institution events (co-organized events)
CREATE TABLE public.institution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  event_date timestamptz,
  event_url text,
  is_pinned boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Institution announcements
CREATE TABLE public.institution_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Institution job visibility (which jobs are visible to which institutions)
CREATE TABLE public.institution_job_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  job_id text NOT NULL, -- can link to job postings
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Institution discussion threads (structured, limited scope)
CREATE TABLE public.institution_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  thread_type text NOT NULL CHECK (thread_type IN ('role', 'event', 'course_followup')),
  title text NOT NULL,
  content text NOT NULL,
  is_archived boolean DEFAULT false,
  archived_at timestamptz,
  archived_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Institution admins (extend existing admin role for institution-specific controls)
CREATE TABLE public.institution_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(institution_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_institution_students_user ON public.institution_students(user_id);
CREATE INDEX idx_institution_students_email ON public.institution_students(email);
CREATE INDEX idx_institution_events_institution ON public.institution_events(institution_id);
CREATE INDEX idx_institution_threads_institution ON public.institution_threads(institution_id);
CREATE INDEX idx_institutions_slug ON public.institutions(slug);

-- Enable RLS on all tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_job_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Institutions: public read for active, admin write
CREATE POLICY "Anyone can view active institutions"
  ON public.institutions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage institutions"
  ON public.institutions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Institution students: only visible to institution members and admins
CREATE POLICY "Members can view their institution's students"
  ON public.institution_students FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.institution_students s 
      WHERE s.institution_id = institution_students.institution_id 
      AND s.user_id = auth.uid() 
      AND s.status = 'active'
    )
  );

CREATE POLICY "Admins can manage institution students"
  ON public.institution_students FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own membership"
  ON public.institution_students FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Institution events: visible to members
CREATE POLICY "Members can view institution events"
  ON public.institution_events FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.institution_students s 
      WHERE s.institution_id = institution_events.institution_id 
      AND s.user_id = auth.uid() 
      AND s.status = 'active'
    )
  );

CREATE POLICY "Admins can manage institution events"
  ON public.institution_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Institution announcements: visible to members
CREATE POLICY "Members can view institution announcements"
  ON public.institution_announcements FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.institution_students s 
      WHERE s.institution_id = institution_announcements.institution_id 
      AND s.user_id = auth.uid() 
      AND s.status = 'active'
    )
  );

CREATE POLICY "Admins can manage institution announcements"
  ON public.institution_announcements FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Institution job visibility: visible to members
CREATE POLICY "Members can view institution jobs"
  ON public.institution_job_visibility FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.institution_students s 
      WHERE s.institution_id = institution_job_visibility.institution_id 
      AND s.user_id = auth.uid() 
      AND s.status = 'active'
    )
  );

CREATE POLICY "Admins can manage institution job visibility"
  ON public.institution_job_visibility FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Institution threads: visible and writable by members
CREATE POLICY "Members can view institution threads"
  ON public.institution_threads FOR SELECT
  TO authenticated
  USING (
    is_archived = false
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.institution_students s 
        WHERE s.institution_id = institution_threads.institution_id 
        AND s.user_id = auth.uid() 
        AND s.status = 'active'
      )
    )
  );

CREATE POLICY "Members can create threads"
  ON public.institution_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.institution_students s 
      WHERE s.institution_id = institution_threads.institution_id 
      AND s.user_id = auth.uid() 
      AND s.status = 'active'
    )
  );

CREATE POLICY "Authors can update their threads"
  ON public.institution_threads FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Admins can manage all threads"
  ON public.institution_threads FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Institution admins: only visible to admins
CREATE POLICY "Admins can view institution admins"
  ON public.institution_admins FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage institution admins"
  ON public.institution_admins FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to check if user is member of an institution
CREATE OR REPLACE FUNCTION public.is_institution_member(_user_id uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_students
    WHERE user_id = _user_id
      AND institution_id = _institution_id
      AND status = 'active'
  )
$$;

-- Function to get user's institutions
CREATE OR REPLACE FUNCTION public.get_user_institutions(_user_id uuid)
RETURNS TABLE(institution_id uuid, institution_name text, institution_slug text, institution_logo text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.name, i.slug, i.logo_url
  FROM public.institutions i
  JOIN public.institution_students s ON s.institution_id = i.id
  WHERE s.user_id = _user_id
    AND s.status = 'active'
    AND i.is_active = true
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_institution_events_updated_at
  BEFORE UPDATE ON public.institution_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_institution_announcements_updated_at
  BEFORE UPDATE ON public.institution_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_institution_threads_updated_at
  BEFORE UPDATE ON public.institution_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();