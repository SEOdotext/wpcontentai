-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can invite users" ON organisation_memberships;
DROP POLICY IF EXISTS "Allow creating new user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage website access for new users" ON website_access;

-- Create new policy to allow creating user profiles
CREATE POLICY "Allow creating new user profiles"
    ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create new policy to allow admins to invite users
CREATE POLICY "Only admins can invite users"
    ON organisation_memberships
    FOR INSERT
    TO public
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM organisation_memberships
            WHERE member_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Create new policy to allow admins to manage website access
CREATE POLICY "Admins can manage website access for new users"
    ON website_access
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1
            FROM organisation_memberships
            WHERE member_id = auth.uid()
            AND role = 'admin'
        )
    ); 