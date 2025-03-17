-- Create website_content table
CREATE TABLE IF NOT EXISTS website_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('page', 'post', 'sitemap', 'other')),
  type TEXT NOT NULL CHECK (type IN ('page', 'post', 'custom')),
  status TEXT NOT NULL CHECK (status IN ('published', 'draft')),
  meta_description TEXT,
  meta_keywords TEXT,
  last_fetched TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(website_id, url)
);

-- Add RLS policies
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select their own website content
CREATE POLICY select_website_content ON website_content
  FOR SELECT
  USING (
    website_id IN (
      SELECT id FROM websites
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Create policy to allow users to insert their own website content
CREATE POLICY insert_website_content ON website_content
  FOR INSERT
  WITH CHECK (
    website_id IN (
      SELECT id FROM websites
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Create policy to allow users to update their own website content
CREATE POLICY update_website_content ON website_content
  FOR UPDATE
  USING (
    website_id IN (
      SELECT id FROM websites
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Create policy to allow users to delete their own website content
CREATE POLICY delete_website_content ON website_content
  FOR DELETE
  USING (
    website_id IN (
      SELECT id FROM websites
      WHERE organisation_id IN (
        SELECT organisation_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Create index for faster queries
CREATE INDEX website_content_website_id_idx ON website_content(website_id);
CREATE INDEX website_content_type_idx ON website_content(type);
CREATE INDEX website_content_status_idx ON website_content(status);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_website_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update the updated_at timestamp
CREATE TRIGGER update_website_content_updated_at
BEFORE UPDATE ON website_content
FOR EACH ROW
EXECUTE FUNCTION update_website_content_updated_at(); 