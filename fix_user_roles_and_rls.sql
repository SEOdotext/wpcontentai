-- First, ensure the user_profiles table has a role field
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member' 
CHECK (role IN ('admin', 'member'));

-- Create a new table to manage website access for members
CREATE TABLE IF NOT EXISTS website_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, website_id)
);

-- Add RLS to the website_access table
ALTER TABLE website_access ENABLE ROW LEVEL SECURITY;

-- Only admins can manage website access
CREATE POLICY manage_website_access ON website_access
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update RLS policies for post_themes
DROP POLICY IF EXISTS select_post_themes ON post_themes;
DROP POLICY IF EXISTS insert_post_themes ON post_themes;
DROP POLICY IF EXISTS update_post_themes ON post_themes;
DROP POLICY IF EXISTS delete_post_themes ON post_themes;
DROP POLICY IF EXISTS post_themes_all_operations ON post_themes;

-- Create new policy for post_themes that respects roles
CREATE POLICY post_themes_policy ON post_themes
  USING (
    -- Admins can access all post themes in their organization
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN websites w ON w.organisation_id = up.organisation_id
        WHERE up.id = auth.uid() 
        AND up.role = 'admin'
        AND w.id = post_themes.website_id
      )
    )
    OR
    -- Members can only access post themes for websites they have access to
    (
      EXISTS (
        SELECT 1 FROM website_access wa
        WHERE wa.user_id = auth.uid()
        AND wa.website_id = post_themes.website_id
      )
    )
  )
  WITH CHECK (
    -- Admins can modify all post themes in their organization
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN websites w ON w.organisation_id = up.organisation_id
        WHERE up.id = auth.uid() 
        AND up.role = 'admin'
        AND w.id = post_themes.website_id
      )
    )
    OR
    -- Members can only modify post themes for websites they have access to
    (
      EXISTS (
        SELECT 1 FROM website_access wa
        WHERE wa.user_id = auth.uid()
        AND wa.website_id = post_themes.website_id
      )
    )
  );

-- Update RLS policies for websites table
DROP POLICY IF EXISTS select_websites ON websites;
DROP POLICY IF EXISTS insert_websites ON websites;
DROP POLICY IF EXISTS update_websites ON websites;
DROP POLICY IF EXISTS delete_websites ON websites;

-- Create new policy for websites that respects roles
CREATE POLICY websites_policy ON websites
  USING (
    -- Admins can access all websites in their organization
    (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND organisation_id = websites.organisation_id
      )
    )
    OR
    -- Members can only access websites they have been granted access to
    (
      EXISTS (
        SELECT 1 FROM website_access
        WHERE user_id = auth.uid()
        AND website_id = websites.id
      )
    )
  )
  WITH CHECK (
    -- Only admins can modify websites
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND organisation_id = websites.organisation_id
    )
  );

-- Set the current user as an admin (replace with the actual user ID if needed)
UPDATE user_profiles
SET role = 'admin'
WHERE id = auth.uid();

-- Grant the current user access to the specific website
INSERT INTO website_access (user_id, website_id)
VALUES (auth.uid(), 'ed71650a-4d0c-4763-bc4d-5a6a475548c5')
ON CONFLICT (user_id, website_id) DO NOTHING;

-- Verify the changes
SELECT * FROM user_profiles WHERE id = auth.uid();
SELECT * FROM website_access WHERE user_id = auth.uid();
SELECT * FROM pg_policies WHERE tablename IN ('post_themes', 'websites', 'website_access'); 