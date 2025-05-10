-- Create image source enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE image_source AS ENUM (
        'upload',
        'ai_generated',
        'external_url',
        'scraped',
        'stock_library',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create post_images table
CREATE TABLE IF NOT EXISTS post_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    size INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type LIKE 'image/%'),
    source image_source NOT NULL DEFAULT 'upload',
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on website_id for faster queries
CREATE INDEX IF NOT EXISTS post_images_website_id_idx ON post_images(website_id);

-- Create index on source for faster filtering
CREATE INDEX IF NOT EXISTS post_images_source_idx ON post_images(source);

-- Create index on metadata for faster JSON queries
CREATE INDEX IF NOT EXISTS post_images_metadata_gin_idx ON post_images USING gin(metadata);

-- Enable RLS
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view images for their websites"
ON post_images FOR SELECT
USING (
  website_id IN (
    SELECT website_id 
    FROM website_access 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert images for their websites"
ON post_images FOR INSERT
WITH CHECK (
  website_id IN (
    SELECT website_id 
    FROM website_access 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update images for their websites"
ON post_images FOR UPDATE
USING (
  website_id IN (
    SELECT website_id 
    FROM website_access 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete images for their websites"
ON post_images FOR DELETE
USING (
  website_id IN (
    SELECT website_id 
    FROM website_access 
    WHERE user_id = auth.uid()
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_post_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_post_images_updated_at
    BEFORE UPDATE ON post_images
    FOR EACH ROW
    EXECUTE FUNCTION update_post_images_updated_at(); 