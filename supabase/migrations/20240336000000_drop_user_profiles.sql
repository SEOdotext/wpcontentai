-- Drop all policies on user_profiles
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage users in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow manage own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow creating new user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Drop dependent functions
DROP FUNCTION IF EXISTS get_current_user_profile();
DROP FUNCTION IF EXISTS get_user_profile_by_id(uuid);

-- Drop the user_profiles table
DROP TABLE IF EXISTS user_profiles; 