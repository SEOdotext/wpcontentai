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
  -- Image fields
  image TEXT,
  image_generation_error TEXT,
  post_content TEXT,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'published', 'textgenerated', 'generated', 'declined', 'generatingidea'))
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

-- Create function to handle post theme deletion
CREATE OR REPLACE FUNCTION handle_post_theme_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete associated category links
  DELETE FROM post_theme_categories WHERE post_theme_id = OLD.id;
  
  -- Delete associated image generation queue items
  DELETE FROM image_generation_queue WHERE post_theme_id = OLD.id;
  
  -- Delete associated publish queue items
  DELETE FROM publish_queue WHERE post_theme_id = OLD.id;
  
  RETURN OLD;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_post_theme_deletion_trigger ON post_themes;

-- Create trigger to handle post theme deletion
CREATE TRIGGER handle_post_theme_deletion_trigger
  BEFORE DELETE ON post_themes
  FOR EACH ROW
  EXECUTE FUNCTION handle_post_theme_deletion();

-- Add comments for documentation
COMMENT ON TABLE post_themes IS 'Stores post themes for content generation and WordPress publishing';
COMMENT ON COLUMN post_themes.id IS 'Unique identifier for the post theme';
COMMENT ON COLUMN post_themes.website_id IS 'Reference to the website this post theme belongs to';
COMMENT ON COLUMN post_themes.subject_matter IS 'The main subject or title of the post';
COMMENT ON COLUMN post_themes.keywords IS 'Array of keywords associated with the post theme';
COMMENT ON COLUMN post_themes.content IS 'The generated content for the post';
COMMENT ON COLUMN post_themes.status IS 'Current status of the post theme (pending, approved, published)';
COMMENT ON COLUMN post_themes.scheduled_date IS 'When the post is scheduled to be published';
COMMENT ON COLUMN post_themes.wp_post_id IS 'WordPress post ID after publishing';
COMMENT ON COLUMN post_themes.wp_post_url IS 'URL of the published post on WordPress';
COMMENT ON COLUMN post_themes.wp_sent_date IS 'When the post was sent to WordPress';
COMMENT ON COLUMN post_themes.image IS 'URL of the generated image';
COMMENT ON COLUMN post_themes.image_generation_error IS 'Error message if image generation failed';
COMMENT ON COLUMN post_themes.post_content IS 'The final content to be published'; 