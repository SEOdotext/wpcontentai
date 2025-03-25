-- Create post_themes table
CREATE TABLE IF NOT EXISTS post_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  subject_matter TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- WordPress integration fields
  wp_post_id TEXT,
  wp_post_url TEXT,
  wp_sent_date TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'generated', 'published'))
);

-- Enable Row Level Security
ALTER TABLE post_themes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own post themes"
  ON post_themes FOR SELECT
  USING (
    website_id IN (
      SELECT website_id FROM website_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own post themes"
  ON post_themes FOR INSERT
  WITH CHECK (
    website_id IN (
      SELECT website_id FROM website_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own post themes"
  ON post_themes FOR UPDATE
  USING (
    website_id IN (
      SELECT website_id FROM website_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own post themes"
  ON post_themes FOR DELETE
  USING (
    website_id IN (
      SELECT website_id FROM website_access
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_post_themes_website_id ON post_themes(website_id);
CREATE INDEX idx_post_themes_status ON post_themes(status);
CREATE INDEX idx_post_themes_scheduled_date ON post_themes(scheduled_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_post_themes_updated_at ON post_themes;

-- Create trigger
CREATE TRIGGER update_post_themes_updated_at
  BEFORE UPDATE ON post_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 