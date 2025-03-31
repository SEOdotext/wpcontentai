-- Drop existing policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organisation_memberships;
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON organisation_memberships;

-- Create a helper function to check if a user is in an organization
CREATE OR REPLACE FUNCTION is_user_in_organization(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM organisation_memberships
        WHERE member_id = p_user_id
        AND organisation_id = p_org_id
    );
END;
$$;

-- Create new policy to allow viewing all profiles (needed for the team management page)
CREATE POLICY "Users can view all profiles"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy for viewing own memberships
CREATE POLICY "Users can view their own memberships"
    ON organisation_memberships
    FOR SELECT
    USING (member_id = auth.uid());

-- Create policy for viewing memberships in organizations the user belongs to
CREATE POLICY "Users can view memberships in their organizations"
    ON organisation_memberships
    FOR SELECT
    USING (is_user_in_organization(auth.uid(), organisation_id));

-- Create policy to allow viewing profiles of users in the same organization
CREATE POLICY "Users can view profiles in their organization"
    ON user_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM organisation_memberships om
            WHERE om.member_id = user_profiles.id
            AND is_user_in_organization(auth.uid(), om.organisation_id)
        )
    ); 