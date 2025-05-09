-- Create image source enum
CREATE TYPE image_source AS ENUM (
    'upload',
    'ai_generated',
    'external_url',
    'scraped',
    'stock_library',
    'other'
);

-- Create images table
CREATE TABLE IF NOT EXISTS images (
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
CREATE INDEX IF NOT EXISTS images_website_id_idx ON images(website_id);

-- Create index on source for faster filtering
CREATE INDEX IF NOT EXISTS images_source_idx ON images(source);

-- Create index on metadata for faster JSON queries
CREATE INDEX IF NOT EXISTS images_metadata_gin_idx ON images USING gin(metadata);

-- Create RLS policies
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view images for their websites
CREATE POLICY "Users can view images for their websites"
    ON images FOR SELECT
    USING (
        website_id IN (
            SELECT website_id 
            FROM website_access 
            WHERE user_id = auth.uid()
        )
    );

-- Policy to allow users to insert images for their websites
CREATE POLICY "Users can insert images for their websites"
    ON images FOR INSERT
    WITH CHECK (
        website_id IN (
            SELECT website_id 
            FROM website_access 
            WHERE user_id = auth.uid()
        )
    );

-- Policy to allow users to update images for their websites
CREATE POLICY "Users can update images for their websites"
    ON images FOR UPDATE
    USING (
        website_id IN (
            SELECT website_id 
            FROM website_access 
            WHERE user_id = auth.uid()
        )
    );

-- Policy to allow users to delete images for their websites
CREATE POLICY "Users can delete images for their websites"
    ON images FOR DELETE
    USING (
        website_id IN (
            SELECT website_id 
            FROM website_access 
            WHERE user_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_images_updated_at
    BEFORE UPDATE ON images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 