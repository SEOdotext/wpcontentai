-- Enable Row Level Security on publish_queue
ALTER TABLE publish_queue ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on image_generation_queue
ALTER TABLE image_generation_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view publish_queue entries for their post_themes" ON publish_queue;
DROP POLICY IF EXISTS "System can access all publish_queue entries" ON publish_queue;
DROP POLICY IF EXISTS "Users can view image_generation_queue entries for their post_themes" ON image_generation_queue;
DROP POLICY IF EXISTS "System can access all image_generation_queue entries" ON image_generation_queue;

-- Policy for selecting publish_queue entries
CREATE POLICY "Users can view publish_queue entries for their post_themes"
    ON publish_queue FOR SELECT
    USING (
        post_theme_id IN (
            SELECT pt.id FROM post_themes pt
            JOIN websites w ON pt.website_id = w.id
            WHERE w.organisation_id IN (
                SELECT organisation_id FROM organisation_memberships
                WHERE member_id = auth.uid()
            )
        )
    );

-- Policy for inserting publish_queue entries
CREATE POLICY "Users can insert publish_queue entries"
    ON publish_queue FOR INSERT
    WITH CHECK (
        post_theme_id IN (
            SELECT pt.id FROM post_themes pt
            JOIN websites w ON pt.website_id = w.id
            WHERE w.organisation_id IN (
                SELECT organisation_id FROM organisation_memberships
                WHERE member_id = auth.uid()
            )
        )
    );

-- Policy for system access to publish_queue (service role)
CREATE POLICY "System can access all publish_queue entries"
    ON publish_queue FOR ALL
    USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role');

-- Policy for selecting image_generation_queue entries
CREATE POLICY "Users can view image_generation_queue entries for their post_themes"
    ON image_generation_queue FOR SELECT
    USING (
        post_theme_id IN (
            SELECT pt.id FROM post_themes pt
            JOIN websites w ON pt.website_id = w.id
            WHERE w.organisation_id IN (
                SELECT organisation_id FROM organisation_memberships
                WHERE member_id = auth.uid()
            )
        )
    );

-- Policy for inserting image_generation_queue entries
CREATE POLICY "Users can insert image_generation_queue entries"
    ON image_generation_queue FOR INSERT
    WITH CHECK (
        post_theme_id IN (
            SELECT pt.id FROM post_themes pt
            JOIN websites w ON pt.website_id = w.id
            WHERE w.organisation_id IN (
                SELECT organisation_id FROM organisation_memberships
                WHERE member_id = auth.uid()
            )
        )
    );

-- Policy for system access to image_generation_queue (service role)
CREATE POLICY "System can access all image_generation_queue entries"
    ON image_generation_queue FOR ALL
    USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role');

-- Add policies for post_themes table if not already present
DROP POLICY IF EXISTS "Users can view post_themes in their organization" ON post_themes;

CREATE POLICY "Users can view post_themes in their organization"
    ON post_themes FOR SELECT
    USING (
        website_id IN (
            SELECT id FROM websites
            WHERE organisation_id IN (
                SELECT organisation_id FROM organisation_memberships
                WHERE member_id = auth.uid()
            )
        )
    ); 