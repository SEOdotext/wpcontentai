-- Add version column to post_themes table
ALTER TABLE post_themes
ADD COLUMN version INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN post_themes.version IS 'Tracks the version of the post theme for optimistic locking';

-- Update existing rows to have version 0
UPDATE post_themes SET version = 0 WHERE version IS NULL; 