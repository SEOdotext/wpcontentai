-- SQL script to remove the is_primary column after the trigger has been dropped
-- Run this in the Supabase SQL editor AFTER running drop_primary_content_trigger.sql

-- First, verify that the trigger has been dropped
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'website_content'
AND trigger_name = 'website_content_primary_trigger';

-- If the above query returns no rows, it's safe to proceed

-- Drop the index on is_primary
DROP INDEX IF EXISTS idx_website_content_is_primary;

-- Remove the is_primary column
ALTER TABLE website_content DROP COLUMN IF EXISTS is_primary;

-- Verify that the column has been dropped
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'website_content'
AND column_name = 'is_primary';

-- This query should return no rows if the column has been dropped successfully 