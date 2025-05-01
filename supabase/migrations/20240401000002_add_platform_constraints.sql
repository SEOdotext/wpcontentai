-- Create the platform enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_media_platform') THEN
        CREATE TYPE social_media_platform AS ENUM (
            'linkedin',
            'instagram',
            'tiktok',
            'facebook'
        );
    END IF;
END $$;

-- First convert existing data if any to match the enum values
UPDATE some_posts 
SET platform = (
    CASE platform
        WHEN 'LINKEDIN' THEN 'linkedin'
        WHEN 'INSTAGRAM' THEN 'instagram'
        WHEN 'TIKTOK' THEN 'tiktok'
        WHEN 'FACEBOOK' THEN 'facebook'
        ELSE platform
    END
)::text
WHERE platform IS NOT NULL;

UPDATE some_settings
SET platform = (
    CASE platform
        WHEN 'LINKEDIN' THEN 'linkedin'
        WHEN 'INSTAGRAM' THEN 'instagram'
        WHEN 'TIKTOK' THEN 'tiktok'
        WHEN 'FACEBOOK' THEN 'facebook'
        ELSE platform
    END
)::text
WHERE platform IS NOT NULL;

-- Alter the columns to use the new enum type
ALTER TABLE some_posts 
    ALTER COLUMN platform TYPE social_media_platform 
    USING platform::social_media_platform;

ALTER TABLE some_settings 
    ALTER COLUMN platform TYPE social_media_platform 
    USING platform::social_media_platform;

-- Add unique constraint to some_settings to prevent duplicate platform settings per website
ALTER TABLE some_settings 
    ADD CONSTRAINT some_settings_website_platform_unique 
    UNIQUE (website_id, platform);

-- Add comment to explain the platform values
COMMENT ON TYPE social_media_platform IS 'Supported social media platforms: linkedin, instagram, tiktok, facebook';

-- Create down migration
/*
-- To revert:
ALTER TABLE some_posts ALTER COLUMN platform TYPE text;
ALTER TABLE some_settings ALTER COLUMN platform TYPE text;
ALTER TABLE some_settings DROP CONSTRAINT IF EXISTS some_settings_website_platform_unique;
DROP TYPE social_media_platform;
*/ 