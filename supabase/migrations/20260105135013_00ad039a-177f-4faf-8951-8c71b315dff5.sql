-- Allow admins to upload institution logos to avatars bucket
CREATE POLICY "Admins can upload institution logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'institutions'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update institution logos
CREATE POLICY "Admins can update institution logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'institutions'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete institution logos  
CREATE POLICY "Admins can delete institution logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'institutions'
  AND public.has_role(auth.uid(), 'admin')
);