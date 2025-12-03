-- Remove the conflicting public access policy that allows anyone to read idea videos
DROP POLICY IF EXISTS "Public read access for idea videos" ON storage.objects;