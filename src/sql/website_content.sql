-- Create the website_content table to store content from website pages and posts
CREATE TABLE IF NOT EXISTS website_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'page', 'post', 'sitemap', etc.
  last_fetched TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb -- For storing additional data like categories, tags, etc.
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS website_content_website_id_idx ON website_content(website_id);
CREATE INDEX IF NOT EXISTS website_content_url_idx ON website_content(url);
CREATE INDEX IF NOT EXISTS website_content_content_type_idx ON website_content(content_type);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_website_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add a trigger to update the updated_at timestamp
CREATE TRIGGER update_website_content_updated_at
BEFORE UPDATE ON website_content
FOR EACH ROW
EXECUTE FUNCTION update_website_content_updated_at();

-- Add RLS policies for the website_content table

-- Policy for selecting website_content (users can only see content for websites they have access to)
CREATE POLICY select_website_content ON website_content
FOR SELECT
USING (
  website_id IN (
    SELECT w.id FROM websites w
    JOIN user_profiles up ON up.organisation_id = w.organisation_id
    WHERE up.id = auth.uid()
  )
);

-- Policy for inserting website_content (users can only insert content for websites they have access to)
CREATE POLICY insert_website_content ON website_content
FOR INSERT
WITH CHECK (
  website_id IN (
    SELECT w.id FROM websites w
    JOIN user_profiles up ON up.organisation_id = w.organisation_id
    WHERE up.id = auth.uid()
  )
);

-- Policy for updating website_content (users can only update content for websites they have access to)
CREATE POLICY update_website_content ON website_content
FOR UPDATE
USING (
  website_id IN (
    SELECT w.id FROM websites w
    JOIN user_profiles up ON up.organisation_id = w.organisation_id
    WHERE up.id = auth.uid()
  )
);

-- Policy for deleting website_content (users can only delete content for websites they have access to)
CREATE POLICY delete_website_content ON website_content
FOR DELETE
USING (
  website_id IN (
    SELECT w.id FROM websites w
    JOIN user_profiles up ON up.organisation_id = w.organisation_id
    WHERE up.id = auth.uid()
  )
);

-- Enable RLS on the website_content table
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY; 