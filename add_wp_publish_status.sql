-- Add publish_status column to wordpress_settings table
ALTER TABLE wordpress_settings
ADD COLUMN IF NOT EXISTS publish_status TEXT DEFAULT 'draft' NOT NULL;
