-- Make course-files bucket public so thumbnails can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'course-files';