-- Create a table to store image generation errors
CREATE TABLE IF NOT EXISTS image_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL,
  error TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (post_id) REFERENCES post_themes(id) ON DELETE CASCADE
); 