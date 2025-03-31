-- Enable the pgcrypto extension in the auth schema
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA auth;

-- Drop the existing function first
DROP FUNCTION IF EXISTS handle_organisation_invitation(TEXT, UUID, TEXT, UUID[]);

-- Create the updated function
CREATE OR REPLACE FUNCTION handle_organisation_invitation(
    p_email TEXT,
    p_organisation_id UUID,
    p_role TEXT,
    p_website_ids UUID[]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user exists in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;

    -- If user exists, check if they're already in the organization
    IF v_user_id IS NOT NULL THEN
        -- Check if already a member
        IF EXISTS (
            SELECT 1
            FROM organisation_memberships
            WHERE member_id = v_user_id
            AND organisation_id = p_organisation_id
        ) THEN
            RETURN jsonb_build_object(
                'status', 'error',
                'message', 'User is already a member of this organization'
            );
        END IF;
    ELSE
        -- Return error - user needs to be created first
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'User does not exist. Please create the user first using Supabase Auth.'
        );
    END IF;

    -- Create organization membership first (this bypasses RLS due to SECURITY DEFINER)
    INSERT INTO organisation_memberships (
        member_id,
        organisation_id,
        role
    ) VALUES (
        v_user_id,
        p_organisation_id,
        p_role
    );

    -- Now create user profile if it doesn't exist
    INSERT INTO user_profiles (
        id,
        email,
        role
    ) VALUES (
        v_user_id,
        p_email,
        'user'
    )
    ON CONFLICT (id) DO NOTHING;

    -- If role is member and website_ids are provided, create website access
    IF p_role = 'member' AND p_website_ids IS NOT NULL THEN
        INSERT INTO website_access (user_id, website_id)
        SELECT v_user_id, unnest(p_website_ids);
    END IF;

    -- Return success response
    RETURN jsonb_build_object(
        'status', 'success',
        'user_id', v_user_id,
        'is_new_user', NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = v_user_id),
        'message', 'User added to organization'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION handle_organisation_invitation TO authenticated; 