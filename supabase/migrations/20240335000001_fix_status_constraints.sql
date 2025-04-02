-- Drop existing status constraints
ALTER TABLE post_themes DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE post_themes DROP CONSTRAINT IF EXISTS post_themes_status_check;
ALTER TABLE publish_queue DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE publish_queue DROP CONSTRAINT IF EXISTS publish_queue_status_check;

-- Add unified status constraint for post_themes
ALTER TABLE post_themes ADD CONSTRAINT post_themes_status_check
  CHECK (status IN (
    'pending',          -- Initial state
    'processing',       -- Being processed
    'textgenerated',   -- Text generation complete
    'generated',       -- Both text and image generated
    'approved',        -- Ready for publishing
    'published',       -- Successfully published
    'declined',        -- Rejected
    'failed',          -- Processing failed
    'generatingidea'   -- Initial idea generation
  ));

-- Add unified status constraint for publish_queue
ALTER TABLE publish_queue ADD CONSTRAINT publish_queue_status_check
  CHECK (status IN (
    'pending',     -- Waiting to be processed
    'processing',  -- Currently being processed
    'completed',   -- Successfully completed
    'failed'       -- Processing failed
  ));

-- Add comment explaining the constraints
COMMENT ON CONSTRAINT post_themes_status_check ON post_themes IS 
  'Valid post theme statuses for the complete content generation workflow';
COMMENT ON CONSTRAINT publish_queue_status_check ON publish_queue IS 
  'Valid statuses for the publishing queue workflow'; 