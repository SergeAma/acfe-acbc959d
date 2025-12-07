-- Allow anyone to view certificates for verification purposes (public access)
CREATE POLICY "Anyone can verify certificates" 
ON public.course_certificates 
FOR SELECT 
USING (true);