-- Update the course-files bucket to allow video mime types for student assignments
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'image/heic',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-ms-wmv'
],
file_size_limit = 104857600  -- Increase to 100MB for video files
WHERE id = 'course-files';