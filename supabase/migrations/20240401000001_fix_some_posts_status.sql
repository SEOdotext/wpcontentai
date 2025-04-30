-- Drop the column first since there's no data
ALTER TABLE some_posts DROP COLUMN IF EXISTS status;

-- Create the enum type
DROP TYPE IF EXISTS social_media_post_status;
CREATE TYPE social_media_post_status AS ENUM (
    'pending',
    'approved',
    'published',
    'textgenerated',
    'generated',
    'declined'
);

-- Add the column back with the new type
ALTER TABLE some_posts 
    ADD COLUMN status social_media_post_status NOT NULL DEFAULT 'pending';

-- Add comment to explain the status values
COMMENT ON COLUMN some_posts.status IS 'Status of the social media post. Can be: pending, approved, published, textgenerated, generated, or declined';

-- Create down migration
/*
-- To revert:
ALTER TABLE some_posts DROP COLUMN status;
DROP TYPE social_media_post_status;
*/ 