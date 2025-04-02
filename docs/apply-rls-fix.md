# Applying RLS Fixes via Supabase Dashboard

To fix the realtime subscription issues with the publish queue monitoring, you need to apply the Row Level Security (RLS) policies to your Supabase database. Here's how to do it directly through the Supabase dashboard:

## 1. Access SQL Editor

1. Log into the [Supabase dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to the **SQL Editor** in the left sidebar

## 2. Create a New Query

1. Click on the "+" button to create a new query
2. Name it something like "Apply Queue RLS Fixes"

## 3. Paste the SQL

Copy and paste the following SQL into the query editor:

```sql
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
```

## 4. Run the Query

1. Click the "Run" button (or press Ctrl+Enter)
2. Wait for the query to complete

## 5. Verify the Policies

To verify that the policies have been applied correctly:

1. Go to the **Table Editor** in the left sidebar
2. Select the `publish_queue` table
3. Click on the "Policies" tab
4. You should see the policies listed:
   - "Users can view publish_queue entries for their post_themes"
   - "Users can insert publish_queue entries"
   - "System can access all publish_queue entries"

5. Do the same for the `image_generation_queue` table

## 6. Test Realtime Subscriptions

Once the policies are applied, you can test the realtime subscriptions in your application:

1. Navigate to your application
2. Use the `PublishQueueMonitor` component or the subscription functions
3. Check the browser console for subscription status messages
4. Trigger a content generation operation to verify updates are flowing through

## Troubleshooting

If you encounter any errors during the SQL execution:

1. Make sure you're logged in with admin privileges
2. Check if the tables mentioned in the SQL actually exist
3. Look for any error messages in the SQL Editor output

If subscriptions still aren't working after applying the policies:

1. Verify that you're using the correct postThemeId in your subscriptions
2. Check that the user has membership in the organization that owns the post theme
3. Try restarting your application 