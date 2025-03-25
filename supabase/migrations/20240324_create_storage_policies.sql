-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow service role to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read images" ON storage.objects;

-- Create storage policies for post-images bucket
CREATE POLICY "Allow service role to upload images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (
  bucket_id = 'post-images'
);

CREATE POLICY "Allow public to read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; 