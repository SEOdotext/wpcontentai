-- Update social media post statuses to match main post statuses
DO $$ BEGIN
    -- Create new enum type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_media_post_status') THEN
        CREATE TYPE social_media_post_status AS ENUM (
            'pending',
            'approved',
            'published',
            'textgenerated',
            'generated',
            'declined',
            'generatingidea'
        );
    END IF;
END $$;

-- Drop existing constraint if any
ALTER TABLE some_posts DROP CONSTRAINT IF EXISTS some_posts_status_check;

-- Convert status column to use the enum type
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