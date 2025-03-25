-- Simple SQL script to fix cornerstone content issues
-- Run this in the Supabase SQL editor

-- Check for triggers on the website_content table
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'website_content';

-- Look for any triggers that might be enforcing a single primary content
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'website_content'
AND action_statement LIKE '%is_primary%';

-- If you find any triggers that are enforcing a single primary content,
-- uncomment and modify the following line to drop them:
-- DROP TRIGGER IF EXISTS trigger_name_here ON website_content;

-- Update any NULL values to FALSE for consistency
UPDATE website_content SET is_primary = FALSE WHERE is_primary IS NULL;

-- Check the current state of cornerstone content
SELECT website_id, COUNT(*) as cornerstone_count
FROM website_content
WHERE is_primary = TRUE
GROUP BY website_id
ORDER BY website_id; 