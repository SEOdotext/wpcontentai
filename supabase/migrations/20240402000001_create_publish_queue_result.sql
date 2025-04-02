-- Create publish_queue_result table for logging function activity
CREATE TABLE IF NOT EXISTS publish_queue_result (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    function_name TEXT NOT NULL,
    queue_job_id UUID REFERENCES publish_queue(id),
    post_theme_id UUID REFERENCES post_themes(id),
    log_level TEXT NOT NULL, -- 'info', 'error', 'debug', etc.
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_publish_queue_result_function_name ON publish_queue_result(function_name);
CREATE INDEX IF NOT EXISTS idx_publish_queue_result_queue_job_id ON publish_queue_result(queue_job_id);
CREATE INDEX IF NOT EXISTS idx_publish_queue_result_post_theme_id ON publish_queue_result(post_theme_id);
CREATE INDEX IF NOT EXISTS idx_publish_queue_result_created_at ON publish_queue_result(created_at);

-- Add RLS policies
ALTER TABLE publish_queue_result ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role can do everything" ON publish_queue_result
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to view their own log entries
CREATE POLICY "Users can view their own log entries" ON publish_queue_result
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