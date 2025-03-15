-- SQL script to fix cornerstone content issues
-- This script will:
-- 1. Check for any triggers that might be enforcing a single primary content
-- 2. Remove those triggers if found
-- 3. Ensure the is_primary column exists and is properly set up
-- 4. List all current cornerstone content for reference

-- Check for triggers on the website_content table
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'website_content';

-- Drop any triggers that might be enforcing a single primary content
-- Uncomment and modify the trigger name after confirming it exists
-- DROP TRIGGER IF EXISTS enforce_single_primary_content ON website_content;

-- Ensure the is_primary column exists and is properly set up
DO $$
BEGIN
    -- Check if the is_primary column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'website_content' AND column_name = 'is_primary'
    ) THEN
        -- Add the is_primary column if it doesn't exist
        ALTER TABLE website_content ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_primary column to website_content table';
    ELSE
        RAISE NOTICE 'is_primary column already exists';
    END IF;
    
    -- Update any NULL values to FALSE for consistency
    UPDATE website_content SET is_primary = FALSE WHERE is_primary IS NULL;
    RAISE NOTICE 'Updated NULL is_primary values to FALSE';
END $$;

-- Create an index on is_primary for better performance
CREATE INDEX IF NOT EXISTS idx_website_content_is_primary ON website_content(is_primary);

-- List all current cornerstone content for reference
SELECT id, website_id, title, url, is_primary
FROM website_content
WHERE is_primary = TRUE
ORDER BY website_id, title;

-- Count cornerstone content by website
SELECT website_id, COUNT(*) as cornerstone_count
FROM website_content
WHERE is_primary = TRUE
GROUP BY website_id
ORDER BY website_id; 