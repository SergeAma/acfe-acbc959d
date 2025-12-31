-- Drop the overly permissive upload policy for idea-videos bucket
DROP POLICY IF EXISTS "Anyone can upload idea videos" ON storage.objects;

-- Create a new policy that requires authentication for uploads
CREATE POLICY "Authenticated users can upload idea videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'idea-videos' AND 
  auth.uid() IS NOT NULL
);