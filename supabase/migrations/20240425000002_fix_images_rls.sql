-- Enable RLS on images table
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view images for their websites" ON images;
DROP POLICY IF EXISTS "Users can insert images for their websites" ON images;
DROP POLICY IF EXISTS "Users can update images for their websites" ON images;
DROP POLICY IF EXISTS "Users can delete images for their websites" ON images;

-- Create policies based on website access
CREATE POLICY "Users can view images for their websites"
ON images FOR SELECT
USING (
  website_id IN (
    SELECT website_id 
    FROM website_access 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert images for their websites"
ON images FOR INSERT
WITH CHECK (
  website_id IN (
    SELECT website_id 
    FROM website_access 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update images for their websites"
ON images FOR UPDATE
USING (
  website_id IN (
    SELECT website_id 
    FROM website_access 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete images for their websites"
ON images FOR DELETE
USING (
  website_id IN (
    SELECT website_id 
    FROM website_access 
    WHERE user_id = auth.uid()
  )
); 