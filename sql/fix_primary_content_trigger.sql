-- SQL script to fix the issue by removing any triggers that might be enforcing a single primary content
-- Run this in the Supabase SQL editor

-- First, let's identify any triggers that might be enforcing a single primary content
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'website_content'
AND action_statement LIKE '%is_primary%';

-- Now, let's drop any triggers that we found
-- This is a dynamic SQL that will generate DROP TRIGGER statements for all triggers
-- that might be enforcing a single primary content
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'website_content'
        AND action_statement LIKE '%is_primary%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_rec.trigger_name || ' ON website_content';
        RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
    END LOOP;
END $$;

-- Let's also check for any functions that might be used by triggers
SELECT proname, prosrc
FROM pg_proc
WHERE prosrc LIKE '%is_primary%'
AND proname LIKE '%website_content%';

-- Now, let's test setting multiple content items as primary
-- First, let's set a few items to TRUE
UPDATE website_content
SET is_primary = TRUE
WHERE id IN (
    SELECT id
    FROM website_content
    ORDER BY created_at DESC
    LIMIT 3
)
RETURNING id, title, is_primary;

-- Check if the update worked
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