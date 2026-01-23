-- ============================================================
-- Security Fix: Protect mentor email addresses from public access
-- ============================================================

-- Drop overly permissive public policies that expose mentor emails
DROP POLICY IF EXISTS "Public can view mentor profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles of course mentors" ON public.profiles;

-- ============================================================
-- Security Fix: Create separate public bucket for thumbnails
-- ============================================================

-- Create a dedicated public bucket for course thumbnails only
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'course-thumbnails', 
  'course-thumbnails', 
  true, 
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  5242880  -- 5MB limit for thumbnails
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Add storage policies for the thumbnails bucket
CREATE POLICY "Public can view course thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-thumbnails');

CREATE POLICY "Mentors can upload course thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-thumbnails' 
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (
    has_role(auth.uid(), 'mentor'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Mentors can update their course thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-thumbnails' 
  AND (
    has_role(auth.uid(), 'mentor'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Mentors can delete their course thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-thumbnails' 
  AND (
    has_role(auth.uid(), 'mentor'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Make course-files bucket private to protect course content
UPDATE storage.buckets 
SET public = false 
WHERE id = 'course-files';