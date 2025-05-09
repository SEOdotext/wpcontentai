-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create basic authenticated access policy
CREATE POLICY "Enable authenticated access"
ON storage.objects
FOR ALL
USING (bucket_id = 'images' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');