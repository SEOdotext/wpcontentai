-- This is a test script to check if role updates are working properly
-- Run this in the SQL Editor to see what's happening

-- 1. First, let's check the current organization memberships
SELECT 
  om.id as membership_id,
  om.member_id as user_id,
  au.email as user_email,
  om.organisation_id,
  org.name as organisation_name,
  om.role,
  om.created_at
FROM 
  organisation_memberships om
  JOIN auth.users au ON om.member_id = au.id
  JOIN organisations org ON om.organisation_id = org.id
ORDER BY 
  org.name, au.email;

-- 2. To test role updates manually, you can run this command (replace the values with actual IDs):
/*
UPDATE organisation_memberships
SET role = 'admin'  -- or 'member' to switch back
WHERE 
  member_id = 'user-uuid-here' AND 
  organisation_id = 'organisation-uuid-here';
*/

-- 3. Check for any triggers on the organisation_memberships table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement  
FROM 
  information_schema.triggers
WHERE 
  event_object_table = 'organisation_memberships';

-- 4. Check for any constraints that might prevent updates
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM
  pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE
  n.nspname = 'public'
  AND t.relname = 'organisation_memberships';

-- 5. Check RLS policies that might be affecting updates
SELECT
  schemaname,
  tablename,
  policyname AS policy_name,
  cmd AS command,
  roles,
  qual AS qualification,
  with_check
FROM
  pg_policies
WHERE
  tablename = 'organisation_memberships';

-- 6. After updating through the UI, run the first query again to see if changes were applied 