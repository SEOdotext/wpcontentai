-- Add last_post_at field to wordpress_settings table
ALTER TABLE wordpress_settings
ADD COLUMN IF NOT EXISTS last_post_at TIMESTAMP WITH TIME ZONE; 