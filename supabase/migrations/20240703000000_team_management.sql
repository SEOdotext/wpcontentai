-- Create website_access table for managing team member access to websites
CREATE TABLE IF NOT EXISTS website_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, website_id)
);

-- Add role column to user_profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'member';
  END IF;
END $$;

-- Create RLS policies for website_access table
ALTER TABLE website_access ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view website access for their organization
CREATE POLICY "Users can view website access for their organization" ON website_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up1
      JOIN user_profiles up2 ON up1.organisation_id = up2.organisation_id
      WHERE up1.id = auth.uid() AND up2.id = user_id
    )
  );

-- Policy: Admin users can insert website access for their organization
CREATE POLICY "Admin users can insert website access for their organization" ON website_access
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up1
      JOIN user_profiles up2 ON up1.organisation_id = up2.organisation_id
      WHERE up1.id = auth.uid() AND up1.role = 'admin' AND up2.id = user_id
    )
  );

-- Policy: Admin users can update website access for their organization
CREATE POLICY "Admin users can update website access for their organization" ON website_access
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up1
      JOIN user_profiles up2 ON up1.organisation_id = up2.organisation_id
      WHERE up1.id = auth.uid() AND up1.role = 'admin' AND up2.id = user_id
    )
  );

-- Policy: Admin users can delete website access for their organization
CREATE POLICY "Admin users can delete website access for their organization" ON website_access
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up1
      JOIN user_profiles up2 ON up1.organisation_id = up2.organisation_id
      WHERE up1.id = auth.uid() AND up1.role = 'admin' AND up2.id = user_id
    )
  );

-- Update RLS policies for user_profiles table
-- Policy: Admin users can update user profiles in their organization
CREATE POLICY "Admin users can update user profiles in their organization" ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin' AND up.organisation_id = organisation_id
    )
  );

-- Policy: Admin users can delete user profiles in their organization
CREATE POLICY "Admin users can delete user profiles in their organization" ON user_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin' AND up.organisation_id = organisation_id
    )
  );

-- Create function to check if user has access to a website
CREATE OR REPLACE FUNCTION public.user_has_website_access(website_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the user's role
  SELECT role INTO user_role FROM user_profiles WHERE id = auth.uid();
  
  -- Admin users have access to all websites in their organization
  IF user_role = 'admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM websites w
      JOIN user_profiles up ON w.organisation_id = up.organisation_id
      WHERE w.id = website_id AND up.id = auth.uid()
    );
  END IF;
  
  -- Regular members need explicit access
  RETURN EXISTS (
    SELECT 1 FROM website_access wa
    WHERE wa.website_id = website_id AND wa.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for websites table to use the new access control function
DROP POLICY IF EXISTS "Users can view websites in their organization" ON websites;
CREATE POLICY "Users can view websites they have access to" ON websites
  FOR SELECT
  USING (
    user_has_website_access(id) OR 
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.organisation_id = organisation_id
    )
  );

-- Update RLS policies for website_content table
DROP POLICY IF EXISTS "Users can view website content in their organization" ON website_content;
CREATE POLICY "Users can view website content they have access to" ON website_content
  FOR SELECT
  USING (
    user_has_website_access(website_id)
  );

DROP POLICY IF EXISTS "Users can insert website content in their organization" ON website_content;
CREATE POLICY "Users can insert website content they have access to" ON website_content
  FOR INSERT
  WITH CHECK (
    user_has_website_access(website_id)
  );

DROP POLICY IF EXISTS "Users can update website content in their organization" ON website_content;
CREATE POLICY "Users can update website content they have access to" ON website_content
  FOR UPDATE
  USING (
    user_has_website_access(website_id)
  );

DROP POLICY IF EXISTS "Users can delete website content in their organization" ON website_content;
CREATE POLICY "Users can delete website content they have access to" ON website_content
  FOR DELETE
  USING (
    user_has_website_access(website_id)
  );

-- Update RLS policies for post_themes table
DROP POLICY IF EXISTS "Users can view post themes in their organization" ON post_themes;
CREATE POLICY "Users can view post themes they have access to" ON post_themes
  FOR SELECT
  USING (
    user_has_website_access(website_id)
  );

DROP POLICY IF EXISTS "Users can insert post themes in their organization" ON post_themes;
CREATE POLICY "Users can insert post themes they have access to" ON post_themes
  FOR INSERT
  WITH CHECK (
    user_has_website_access(website_id)
  );

DROP POLICY IF EXISTS "Users can update post themes in their organization" ON post_themes;
CREATE POLICY "Users can update post themes they have access to" ON post_themes
  FOR UPDATE
  USING (
    user_has_website_access(website_id)
  );

DROP POLICY IF EXISTS "Users can delete post themes in their organization" ON post_themes;
CREATE POLICY "Users can delete post themes they have access to" ON post_themes
  FOR DELETE
  USING (
    user_has_website_access(website_id)
  ); 