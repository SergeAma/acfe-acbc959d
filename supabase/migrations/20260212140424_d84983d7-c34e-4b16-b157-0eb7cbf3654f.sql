
-- Table: broadcast_drafts (one active draft per admin)
CREATE TABLE public.broadcast_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT DEFAULT '',
  message_content TEXT DEFAULT '',
  filters JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(admin_id)
);

ALTER TABLE public.broadcast_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own drafts"
ON public.broadcast_drafts FOR SELECT TO authenticated
USING (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert own drafts"
ON public.broadcast_drafts FOR INSERT TO authenticated
WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update own drafts"
ON public.broadcast_drafts FOR UPDATE TO authenticated
USING (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete own drafts"
ON public.broadcast_drafts FOR DELETE TO authenticated
USING (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

-- Table: broadcast_templates
CREATE TABLE public.broadcast_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT DEFAULT '',
  message_content TEXT DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(created_by, name)
);

ALTER TABLE public.broadcast_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all templates"
ON public.broadcast_templates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert own templates"
ON public.broadcast_templates FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete own templates"
ON public.broadcast_templates FOR DELETE TO authenticated
USING (created_by = auth.uid() AND public.has_role(auth.uid(), 'admin'));
