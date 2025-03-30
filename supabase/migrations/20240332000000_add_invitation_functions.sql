-- Function to handle organization invitations
CREATE OR REPLACE FUNCTION handle_organisation_invitation(
    p_email TEXT,
    p_organisation_id UUID,
    p_role TEXT,
    p_website_ids UUID[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_exists BOOLEAN;
    v_already_member BOOLEAN;
    v_result JSONB;
BEGIN
    -- Check if user exists
    SELECT id INTO v_user_id
    FROM user_profiles
    WHERE email = p_email;

    v_user_exists := v_user_id IS NOT NULL;

    -- If user exists, check if they're already in the organization
    IF v_user_exists THEN
        SELECT EXISTS (
            SELECT 1
            FROM organisation_memberships
            WHERE member_id = v_user_id
            AND organisation_id = p_organisation_id
        ) INTO v_already_member;
    END IF;

    -- Return early if user is already a member
    IF v_already_member THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'User is already a member of this organization'
        );
    END IF;

    -- If user doesn't exist, create them
    IF NOT v_user_exists THEN
        -- Create auth user
        INSERT INTO auth.users (email)
        VALUES (p_email)
        RETURNING id INTO v_user_id;

        -- Create user profile
        INSERT INTO user_profiles (id, email)
        VALUES (v_user_id, p_email);
    END IF;

    -- Create organization membership
    INSERT INTO organisation_memberships (
        member_id,
        organisation_id,
        role
    ) VALUES (
        v_user_id,
        p_organisation_id,
        p_role
    );

    -- If role is member and website_ids are provided, create website access
    IF p_role = 'member' AND p_website_ids IS NOT NULL THEN
        INSERT INTO website_access (user_id, website_id)
        SELECT v_user_id, unnest(p_website_ids);
    END IF;

    -- Return success response
    RETURN jsonb_build_object(
        'status', 'success',
        'user_id', v_user_id,
        'is_new_user', NOT v_user_exists,
        'message', CASE 
            WHEN NOT v_user_exists THEN 'New user created and added to organization'
            ELSE 'Existing user added to organization'
        END
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION handle_organisation_invitation TO authenticated;

-- RLS Policy for the function
ALTER FUNCTION handle_organisation_invitation SET search_path = public;

-- Policy to ensure only admins can invite users
CREATE POLICY "Only admins can invite users"
    ON organisation_memberships
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM organisation_memberships
            WHERE member_id = auth.uid()
            AND organisation_id = organisation_memberships.organisation_id
            AND role = 'admin'
        )
    );

-- Policy to ensure only admins can manage website access
CREATE POLICY "Only admins can manage website access"
    ON website_access
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM organisation_memberships om
            JOIN websites w ON w.organisation_id = om.organisation_id
            WHERE om.member_id = auth.uid()
            AND om.role = 'admin'
            AND w.id = website_access.website_id
        )
    );

-- Function to send invitation email
CREATE OR REPLACE FUNCTION send_invitation_email(
    p_user_id UUID,
    p_organisation_id UUID,
    p_is_new_user BOOLEAN
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email TEXT;
    v_organisation_name TEXT;
    v_role TEXT;
    v_websites JSONB;
BEGIN
    -- Get user email and organization details
    SELECT 
        up.email,
        o.name,
        om.role
    INTO 
        v_email,
        v_organisation_name,
        v_role
    FROM user_profiles up
    JOIN organisation_memberships om ON om.member_id = up.id
    JOIN organisations o ON o.id = om.organisation_id
    WHERE up.id = p_user_id
    AND om.organisation_id = p_organisation_id;

    -- Get website access if user is a member
    IF v_role = 'member' THEN
        SELECT jsonb_agg(jsonb_build_object(
            'id', w.id,
            'name', w.name
        ))
        INTO v_websites
        FROM website_access wa
        JOIN websites w ON w.id = wa.website_id
        WHERE wa.user_id = p_user_id;
    END IF;

    -- TODO: Implement email sending logic here
    -- This could be done through a service like SendGrid, AWS SES, etc.
    -- For now, we'll just log the email details
    RAISE LOG 'Sending invitation email to % for organization % (New user: %)', 
        v_email, v_organisation_name, p_is_new_user;
    
    IF v_role = 'member' THEN
        RAISE LOG 'Website access: %', v_websites;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION send_invitation_email TO authenticated;

-- Example usage in application code:
/*
const { data, error } = await supabase.rpc('handle_organisation_invitation', {
    p_email: 'user@example.com',
    p_organisation_id: 'org-uuid',
    p_role: 'member',
    p_website_ids: ['website-uuid-1', 'website-uuid-2']
});

if (data.status === 'success') {
    // Send invitation email
    await supabase.rpc('send_invitation_email', {
        p_user_id: data.user_id,
        p_organisation_id: 'org-uuid',
        p_is_new_user: data.is_new_user
    });
}
*/ 