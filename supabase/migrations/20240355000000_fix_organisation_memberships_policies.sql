-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert themselves into organisations" ON organisation_memberships;
DROP POLICY IF EXISTS "Only admins can invite users" ON organisation_memberships;

-- Create new policy that combines both requirements
CREATE POLICY "Users can join organizations with admin approval"
    ON organisation_memberships
    FOR INSERT
    WITH CHECK (
        -- Allow users to insert themselves
        (member_id = auth.uid())
        OR
        -- Allow admins to invite users
        (EXISTS (
            SELECT 1 FROM organisation_memberships
            WHERE member_id = auth.uid()
            AND organisation_id = organisation_memberships.organisation_id
            AND role = 'admin'
        ))
    ); 