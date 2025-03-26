-- Add user_token column to publish_queue table
ALTER TABLE publish_queue ADD COLUMN IF NOT EXISTS user_token TEXT NOT NULL DEFAULT ''; 