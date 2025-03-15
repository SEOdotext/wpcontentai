-- SQL script to drop the trigger that enforces the constraint on is_primary
-- Run this in the Supabase SQL editor

-- Drop the trigger that enforces the constraint on is_primary
DROP TRIGGER IF EXISTS website_content_primary_trigger ON website_content;

-- Drop the function that enforces the constraint
DROP FUNCTION IF EXISTS ensure_single_primary_content();

-- Verify that the trigger has been dropped
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'website_content'
AND trigger_name = 'website_content_primary_trigger';

-- This query should return no rows if the trigger has been dropped successfully 