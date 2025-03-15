-- Comprehensive SQL script to check and fix database rules affecting the is_primary field
-- Run this in the Supabase SQL editor

-- 1. Check for triggers on the website_content table
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'website_content';

-- 2. Look for any triggers that might be enforcing a single primary content
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'website_content'
AND action_statement LIKE '%is_primary%';

-- 3. Check for any constraints on the is_primary column
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'website_content'::regclass
AND pg_get_constraintdef(oid) LIKE '%is_primary%';

-- 4. Check for any rules on the table
SELECT rulename, definition
FROM pg_rules
WHERE tablename = 'website_content'
AND definition LIKE '%is_primary%';

-- 5. Check for any exclusion constraints that might be enforcing uniqueness
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'website_content'::regclass
AND contype = 'x'; -- 'x' is for exclusion constraints

-- 6. Check for any unique constraints or indexes
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'website_content'::regclass
AND contype = 'u'; -- 'u' is for unique constraints

-- 7. Check for any foreign key constraints
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'website_content'::regclass
AND contype = 'f'; -- 'f' is for foreign key constraints

-- 8. Check for any check constraints
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'website_content'::regclass
AND contype = 'c'; -- 'c' is for check constraints

-- 9. Check for any primary key constraints
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'website_content'::regclass
AND contype = 'p'; -- 'p' is for primary key constraints

-- 10. Check for any indexes on the is_primary column
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'website_content'
AND indexdef LIKE '%is_primary%';

-- 11. Check the current state of cornerstone content
SELECT website_id, COUNT(*) as cornerstone_count
FROM website_content
WHERE is_primary = TRUE
GROUP BY website_id
ORDER BY website_id;

-- 12. List all content with is_primary = TRUE
SELECT id, website_id, title, url, is_primary
FROM website_content
WHERE is_primary = TRUE
ORDER BY website_id, title;

-- 13. Check for any NULL values in is_primary
SELECT COUNT(*) as null_count
FROM website_content
WHERE is_primary IS NULL;

-- 14. Update any NULL values to FALSE for consistency
UPDATE website_content SET is_primary = FALSE WHERE is_primary IS NULL;

-- 15. Check if there's a function or trigger that might be enforcing a single primary content
SELECT proname, prosrc
FROM pg_proc
WHERE prosrc LIKE '%is_primary%'
AND proname LIKE '%website_content%';

-- 16. Check for any RLS policies that might be affecting the is_primary field
SELECT polname, polcmd, polpermissive, polroles, polqual, polwithcheck
FROM pg_policy
WHERE polrelid = 'website_content'::regclass
AND (polqual::text LIKE '%is_primary%' OR polwithcheck::text LIKE '%is_primary%');

-- 17. If you find any triggers that are enforcing a single primary content,
-- uncomment and modify the following line to drop them:
-- DROP TRIGGER IF EXISTS trigger_name_here ON website_content;

-- 18. If you find any constraints that are enforcing a single primary content,
-- uncomment and modify the following line to drop them:
-- ALTER TABLE website_content DROP CONSTRAINT constraint_name_here;

-- 19. If you find any rules that are enforcing a single primary content,
-- uncomment and modify the following line to drop them:
-- DROP RULE IF EXISTS rule_name_here ON website_content;

-- 20. Test setting multiple content items as primary
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

-- 21. Check if the update worked
SELECT id, website_id, title, url, is_primary
FROM website_content
WHERE is_primary = TRUE
ORDER BY website_id, title; 