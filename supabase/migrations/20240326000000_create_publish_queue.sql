-- Create publish_queue table
CREATE TABLE IF NOT EXISTS publish_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_theme_id UUID NOT NULL REFERENCES post_themes(id),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    result JSONB,
    error TEXT,
    user_token TEXT NOT NULL,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_publish_queue_status ON publish_queue(status);
CREATE INDEX IF NOT EXISTS idx_publish_queue_created_at ON publish_queue(created_at);

-- Add RLS policies
ALTER TABLE publish_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can do everything" ON publish_queue;
DROP POLICY IF EXISTS "Users can view their own queue items" ON publish_queue;
DROP POLICY IF EXISTS "Users can insert their own queue items" ON publish_queue;

-- Allow service role to do everything
CREATE POLICY "Service role can do everything" ON publish_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to view their own queue items
CREATE POLICY "Users can view their own queue items" ON publish_queue
    FOR SELECT
    TO authenticated
    USING (
        post_theme_id IN (
            SELECT id FROM post_themes
            WHERE website_id IN (
                SELECT website_id FROM website_access
                WHERE user_id = auth.uid()
            )
        )
    );

-- Allow authenticated users to insert their own queue items
CREATE POLICY "Users can insert their own queue items" ON publish_queue
    FOR INSERT
    TO authenticated
    WITH CHECK (
        post_theme_id IN (
            SELECT id FROM post_themes
            WHERE website_id IN (
                SELECT website_id FROM website_access
                WHERE user_id = auth.uid()
            )
        )
    ); 