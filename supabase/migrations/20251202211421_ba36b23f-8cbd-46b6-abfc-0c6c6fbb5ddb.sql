-- Create table for idea submissions
CREATE TABLE public.idea_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  idea_title TEXT NOT NULL,
  idea_description TEXT,
  video_url TEXT,
  video_filename TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.idea_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert submissions (public form)
CREATE POLICY "Anyone can submit ideas"
ON public.idea_submissions
FOR INSERT
WITH CHECK (true);

-- Only admins can view all submissions
CREATE POLICY "Admins can view all submissions"
ON public.idea_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update submissions
CREATE POLICY "Admins can update submissions"
ON public.idea_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for idea videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('idea-videos', 'idea-videos', true);

-- Allow anyone to upload to idea-videos bucket
CREATE POLICY "Anyone can upload idea videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'idea-videos');

-- Allow public read access to idea videos
CREATE POLICY "Public read access for idea videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'idea-videos');