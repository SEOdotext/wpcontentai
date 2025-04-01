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
            -- If they're already a member, just return success
            RETURN jsonb_build_object(
                'status', 'success',
                'user_id', v_user_id,
                'is_new_user', false,
                'message', 'User is already a member of this organization'
            );
        END IF;
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

    -- Return success response
    RETURN jsonb_build_object(
        'status', 'success',
        'user_id', v_user_id,
        'is_new_user', v_user_id IS NULL,
        'message', CASE 
            WHEN v_user_id IS NULL THEN 'New user created and added to organization'
            ELSE 'Existing user added to organization'
        END
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION handle_organisation_invitation TO authenticated; 