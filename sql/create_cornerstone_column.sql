-- SQL script to add a new cornerstone column without any constraints
-- Run this in the Supabase SQL editor

-- Add a new cornerstone column
ALTER TABLE website_content ADD COLUMN IF NOT EXISTS is_cornerstone BOOLEAN DEFAULT FALSE;

-- Copy existing is_primary values to is_cornerstone
UPDATE website_content SET is_cornerstone = is_primary WHERE is_primary IS NOT NULL;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_website_content_is_cornerstone ON website_content(is_cornerstone);

-- Test setting multiple content items as cornerstone
UPDATE website_content
SET is_cornerstone = TRUE
WHERE id IN (
    SELECT id
    FROM website_content
    ORDER BY created_at DESC
    LIMIT 3
)
RETURNING id, title, is_cornerstone;

-- Check if the update worked
SELECT id, website_id, title, url, is_cornerstone
FROM website_content
WHERE is_cornerstone = TRUE
ORDER BY website_id, title;

-- Count cornerstone content by website
SELECT website_id, COUNT(*) as cornerstone_count
FROM website_content
WHERE is_cornerstone = TRUE
GROUP BY website_id
ORDER BY website_id; 