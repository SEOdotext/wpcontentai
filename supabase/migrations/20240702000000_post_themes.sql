-- Create post_themes table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  subject_matter TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'published')),
  scheduled_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE post_themes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS select_post_themes ON post_themes;
DROP POLICY IF EXISTS insert_post_themes ON post_themes;
DROP POLICY IF EXISTS update_post_themes ON post_themes;
DROP POLICY IF EXISTS delete_post_themes ON post_themes;

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

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS post_themes_website_id_idx ON post_themes(website_id);
CREATE INDEX IF NOT EXISTS post_themes_subject_matter_idx ON post_themes(subject_matter);
CREATE INDEX IF NOT EXISTS post_themes_status_idx ON post_themes(status);
CREATE INDEX IF NOT EXISTS post_themes_scheduled_date_idx ON post_themes(scheduled_date);

-- Add trigger to update the updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_post_themes_updated_at ON post_themes;
CREATE TRIGGER update_post_themes_updated_at
  BEFORE UPDATE ON post_themes
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column(); 