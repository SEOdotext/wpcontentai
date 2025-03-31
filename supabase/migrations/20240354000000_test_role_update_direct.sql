-- 1. First show current memberships
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

-- 2. Now, for testing purposes, let's directly update a role (replace with actual IDs)
/*
UPDATE organisation_memberships
SET role = 'admin'  -- Change this to 'member' to switch back
WHERE 
  member_id = '26850040-3d2a-4949-b248-a4361c7aedcb' AND  -- Replace with actual member ID
  organisation_id = '9266f562-2a17-4d73-9915-958cf2cf65a5';  -- Replace with actual organization ID
*/

-- 3. Now test our function directly
SELECT update_user_role(
  '26850040-3d2a-4949-b248-a4361c7aedcb',  -- Replace with actual member ID
  '9266f562-2a17-4d73-9915-958cf2cf65a5',  -- Replace with actual organization ID
  'admin'  -- Change this to 'member' to switch back
);

-- 4. Check if the update happened
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