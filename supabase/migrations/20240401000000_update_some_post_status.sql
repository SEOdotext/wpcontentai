-- Drop existing enum type if it exists
DROP TYPE IF EXISTS social_media_post_status CASCADE;

-- Create new enum type with correct values
CREATE TYPE social_media_post_status AS ENUM (
    'pending',
    'approved',
    'published',
    'textgenerated',
    'generated',
    'declined',
    'generatingidea'
);

-- Update the some_posts table to use the new enum type
ALTER TABLE some_posts 
    ALTER COLUMN status TYPE social_media_post_status 
    USING status::social_media_post_status;

-- Add comment to explain the status values
COMMENT ON COLUMN some_posts.status IS 'Status of the social media post. Can be: pending, approved, published, textgenerated, generated, declined, or generatingidea';

-- Create down migration as a comment for reference
/*
-- To revert:
ALTER TABLE some_posts 
    ALTER COLUMN status TYPE text 
    USING status::text;

DROP TYPE social_media_post_status;
*/ 