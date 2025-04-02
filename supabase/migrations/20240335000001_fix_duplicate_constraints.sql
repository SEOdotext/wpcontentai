-- Remove duplicate constraints
ALTER TABLE post_themes DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE publish_queue DROP CONSTRAINT IF EXISTS valid_status;

-- Ensure post_themes has correct statuses for full content lifecycle
ALTER TABLE post_themes ADD CONSTRAINT post_themes_status_check
  CHECK (status IN ('pending', 'approved', 'published', 'textgenerated', 'generated', 'declined', 'generatingidea'));

-- Keep publish_queue with its simple queue statuses
ALTER TABLE publish_queue ADD CONSTRAINT publish_queue_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Note: image_generation_queue already has correct constraint
-- image_generation_queue_status_check: ('pending', 'processing', 'completed', 'failed') 