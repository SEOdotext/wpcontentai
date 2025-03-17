-- First, check the existing policies
SELECT * FROM pg_policies WHERE tablename = 'post_themes';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS select_post_themes ON post_themes;
DROP POLICY IF EXISTS insert_post_themes ON post_themes;
DROP POLICY IF EXISTS update_post_themes ON post_themes;
DROP POLICY IF EXISTS delete_post_themes ON post_themes;

-- Make sure RLS is enabled
ALTER TABLE post_themes ENABLE ROW LEVEL SECURITY;

-- Create a single policy for all operations (simpler approach)
CREATE POLICY post_themes_all_operations ON post_themes
  USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  )
  WITH CHECK (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Verify the new policies
SELECT * FROM pg_policies WHERE tablename = 'post_themes';

-- Check user associations
SELECT auth.uid() as current_user_id;

-- Check user profile
SELECT * FROM user_profiles WHERE id = auth.uid();

-- Check which websites the user has access to
SELECT w.* 
FROM websites w
JOIN user_profiles up ON up.organisation_id = w.organisation_id
WHERE up.id = auth.uid();

-- Check if the specific website exists
SELECT * FROM websites WHERE id = 'ed71650a-4d0c-4763-bc4d-5a6a475548c5';

-- Check if the user has access to this specific website
SELECT w.* 
FROM websites w
JOIN user_profiles up ON up.organisation_id = w.organisation_id
WHERE up.id = auth.uid()
AND w.id = 'ed71650a-4d0c-4763-bc4d-5a6a475548c5'; 