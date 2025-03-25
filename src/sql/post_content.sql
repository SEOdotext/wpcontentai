-- Create post_content table
CREATE TABLE IF NOT EXISTS post_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_theme_id UUID NOT NULL REFERENCES post_themes(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published')),
  wp_post_id INTEGER,
  wp_post_url TEXT,
  wp_sent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE post_content ENABLE ROW LEVEL SECURITY;

-- Policy for selecting post_content (users can only see content for websites they have access to)
CREATE POLICY select_post_content ON post_content
  FOR SELECT USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Policy for inserting post_content
CREATE POLICY insert_post_content ON post_content
  FOR INSERT WITH CHECK (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Policy for updating post_content
CREATE POLICY update_post_content ON post_content
  FOR UPDATE USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Policy for deleting post_content
CREATE POLICY delete_post_content ON post_content
  FOR DELETE USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS post_content_post_theme_id_idx ON post_content(post_theme_id);
CREATE INDEX IF NOT EXISTS post_content_website_id_idx ON post_content(website_id);
CREATE INDEX IF NOT EXISTS post_content_status_idx ON post_content(status);

-- Add trigger to update the updated_at timestamp
CREATE TRIGGER update_post_content_updated_at
  BEFORE UPDATE ON post_content
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column(); 