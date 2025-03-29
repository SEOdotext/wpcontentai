-- Enable Row Level Security on the user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage users in their organization" ON user_profiles;

-- Create helper function to check if user is in organization (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION check_user_in_organization(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE id = user_id
        AND organisation_id = org_id
    );
END;
$$;

-- Create helper function to check if user is admin in organization
CREATE OR REPLACE FUNCTION check_user_is_admin(user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE id = user_id
        AND organisation_id = org_id
        AND role = 'admin'
    );
END;
$$;

-- Policy for viewing profiles (users can only see profiles in their organization)
CREATE POLICY "Users can view profiles in their organization"
    ON user_profiles FOR SELECT
    USING (
        check_user_in_organization(auth.uid(), organisation_id)
    );

-- Policy for updating own profile (users can only update their own profile)
CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (id = auth.uid());

-- Policy for admins managing users (admins can manage users in their organization)
CREATE POLICY "Admins can manage users in their organization"
    ON user_profiles FOR ALL
    USING (
        check_user_is_admin(auth.uid(), organisation_id)
    );

-- Create a function to handle organization and role changes
CREATE OR REPLACE FUNCTION handle_user_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is not an admin making the change
    IF NOT check_user_is_admin(auth.uid(), NEW.organisation_id) THEN
        -- If organization_id is being changed
        IF NEW.organisation_id IS DISTINCT FROM OLD.organisation_id THEN
            RAISE EXCEPTION 'Only admins of the target organization can change organization';
        END IF;
        
        -- If role is being changed
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Only admins can change user roles';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to handle organization changes
DROP TRIGGER IF EXISTS handle_user_profile_changes_trigger ON user_profiles;
CREATE TRIGGER handle_user_profile_changes_trigger
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_profile_changes(); 