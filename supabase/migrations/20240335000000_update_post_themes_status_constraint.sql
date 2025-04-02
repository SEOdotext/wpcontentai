-- Drop all existing status constraints
ALTER TABLE post_themes DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE post_themes DROP CONSTRAINT IF EXISTS post_themes_status_check;
ALTER TABLE post_themes DROP CONSTRAINT IF EXISTS post_themes_status_check1;

-- Add the new constraint with all valid statuses
ALTER TABLE post_themes ADD CONSTRAINT valid_status 
  CHECK (status IN ('pending', 'approved', 'published', 'textgenerated', 'generated', 'declined', 'generatingidea', 'processing', 'completed', 'failed'));

-- Add comment to explain the constraint
COMMENT ON CONSTRAINT valid_status ON post_themes IS 'Valid statuses for post themes: pending, approved, published, textgenerated, generated, declined, generatingidea, processing, completed, failed';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Updated post_themes status constraint to include all valid statuses';
END $$; 