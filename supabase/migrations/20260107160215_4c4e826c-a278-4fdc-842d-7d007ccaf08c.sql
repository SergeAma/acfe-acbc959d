-- Allow enrolled students to upload assignment submissions (videos/files)
CREATE POLICY "Students can upload assignment files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-files' 
  AND (storage.foldername(name))[1] = 'assignments'
  AND (storage.foldername(name))[2] = (auth.uid())::text
  AND auth.uid() IS NOT NULL
);

-- Allow students to update their own assignment files (for resubmission)
CREATE POLICY "Students can update own assignment files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'course-files' 
  AND (storage.foldername(name))[1] = 'assignments'
  AND (storage.foldername(name))[2] = (auth.uid())::text
  AND auth.uid() IS NOT NULL
);

-- Allow students to delete their own assignment files
CREATE POLICY "Students can delete own assignment files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'course-files' 
  AND (storage.foldername(name))[1] = 'assignments'
  AND (storage.foldername(name))[2] = (auth.uid())::text
  AND auth.uid() IS NOT NULL
);