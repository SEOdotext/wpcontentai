-- Create onboarding table to track the onboarding process
CREATE TABLE IF NOT EXISTS onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    website_indexing BOOLEAN DEFAULT FALSE,
    website_indexing_completed_at TIMESTAMP WITH TIME ZONE,
    website_indexing_error TEXT,
    keyword_suggestions BOOLEAN DEFAULT FALSE,
    keyword_suggestions_completed_at TIMESTAMP WITH TIME ZONE,
    keyword_suggestions_error TEXT,
    post_ideas BOOLEAN DEFAULT FALSE,
    post_ideas_completed_at TIMESTAMP WITH TIME ZONE,
    post_ideas_error TEXT,
    client_thumbs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT DEFAULT 'started' NOT NULL,
    CONSTRAINT valid_status CHECK (status IN ('started', 'indexing', 'suggesting_keywords', 'generating_ideas', 'waiting_for_feedback', 'completed', 'error')),
    UNIQUE(website_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_website_id ON onboarding(website_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding(status);

-- Add RLS policies
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role can do everything with onboarding" ON onboarding
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can view onboarding data for their websites
CREATE POLICY "Users can view onboarding data for their websites"
    ON onboarding FOR SELECT
    USING (
        website_id IN (
            SELECT website_id FROM website_access WHERE user_id = auth.uid()
        )
    );

-- Users can insert onboarding data for their websites
CREATE POLICY "Users can insert onboarding data for their websites"
    ON onboarding FOR INSERT
    WITH CHECK (
        website_id IN (
            SELECT website_id FROM website_access WHERE user_id = auth.uid()
        )
    );

-- Users can update onboarding data for their websites
CREATE POLICY "Users can update onboarding data for their websites"
    ON onboarding FOR UPDATE
    USING (
        website_id IN (
            SELECT website_id FROM website_access WHERE user_id = auth.uid()
        )
    );

-- Create trigger for updating the updated_at column
CREATE TRIGGER update_onboarding_updated_at
    BEFORE UPDATE ON onboarding
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 