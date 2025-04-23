-- Add website_id column to publish_queue table
ALTER TABLE publish_queue ADD COLUMN IF NOT EXISTS website_id UUID REFERENCES websites(id);

-- Update existing records with website_id from post_themes
UPDATE publish_queue pq
SET website_id = pt.website_id
FROM post_themes pt
WHERE pq.post_theme_id = pt.id;

-- Make website_id NOT NULL after updating existing records
ALTER TABLE publish_queue ALTER COLUMN website_id SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_publish_queue_website_id ON publish_queue(website_id);

-- Update RLS policies to include website_id
DROP POLICY IF EXISTS "Users can view their own queue items" ON publish_queue;
DROP POLICY IF EXISTS "Users can insert their own queue items" ON publish_queue;

-- Allow authenticated users to view their own queue items
CREATE POLICY "Users can view their own queue items" ON publish_queue
    FOR SELECT
    TO authenticated
    USING (
        website_id IN (
            SELECT website_id FROM website_access
            WHERE user_id = auth.uid()
        )
    );

-- Allow authenticated users to insert their own queue items
CREATE POLICY "Users can insert their own queue items" ON publish_queue
    FOR INSERT
    TO authenticated
    WITH CHECK (
        website_id IN (
            SELECT website_id FROM website_access
            WHERE user_id = auth.uid()
        )
    ); 