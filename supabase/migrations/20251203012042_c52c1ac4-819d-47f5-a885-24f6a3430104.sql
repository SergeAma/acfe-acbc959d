-- Make the idea-videos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'idea-videos';

-- Create RLS policy: Only admins can view/download idea videos
CREATE POLICY "Admins can view idea videos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'idea-videos' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);