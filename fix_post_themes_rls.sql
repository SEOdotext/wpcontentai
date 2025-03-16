-- Drop existing policies if they exist
DROP POLICY IF EXISTS select_post_themes ON post_themes;
DROP POLICY IF EXISTS insert_post_themes ON post_themes;
DROP POLICY IF EXISTS update_post_themes ON post_themes;
DROP POLICY IF EXISTS delete_post_themes ON post_themes;

-- Make sure RLS is enabled
ALTER TABLE post_themes ENABLE ROW LEVEL SECURITY;

-- Policy for selecting post_themes (users can only see themes for websites they have access to)
CREATE POLICY select_post_themes ON post_themes
  FOR SELECT USING (
    website_id IN (
      SELECT id FROM websites
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Policy for inserting post_themes
CREATE POLICY insert_post_themes ON post_themes
  FOR INSERT WITH CHECK (
    website_id IN (
      SELECT id FROM websites
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Policy for updating post_themes
CREATE POLICY update_post_themes ON post_themes
  FOR UPDATE USING (
    website_id IN (
      SELECT id FROM websites
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Policy for deleting post_themes
CREATE POLICY delete_post_themes ON post_themes
  FOR DELETE USING (
    website_id IN (
      SELECT id FROM websites
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  ); 