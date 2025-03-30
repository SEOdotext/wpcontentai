-- Create a security definer function to handle admin setup
CREATE OR REPLACE FUNCTION setup_initial_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
    v_admin_id uuid;
BEGIN
    -- Get the target user's ID and org ID
    SELECT id, organisation_id INTO v_user_id, v_org_id
    FROM user_profiles
    WHERE email = 'philipleth+test4@gmail.com';

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    -- Temporarily disable the trigger
    ALTER TABLE user_profiles DISABLE TRIGGER handle_user_profile_changes_trigger;

    -- Get an existing admin in the organization
    SELECT id INTO v_admin_id
    FROM user_profiles
    WHERE organisation_id = v_org_id AND role = 'admin'
    LIMIT 1;

    -- If no admin exists, make philipleth@gmail.com an admin first
    IF v_admin_id IS NULL THEN
        UPDATE user_profiles
        SET role = 'admin'
        WHERE email = 'philipleth@gmail.com'
        RETURNING id INTO v_admin_id;
    END IF;

    -- Make our target user an admin
    UPDATE user_profiles
    SET role = 'admin'
    WHERE id = v_user_id;

    -- Re-enable the trigger
    ALTER TABLE user_profiles ENABLE TRIGGER handle_user_profile_changes_trigger;

    -- Grant access to all websites
    INSERT INTO website_access (user_id, website_id)
    SELECT v_user_id, id
    FROM websites
    WHERE organisation_id = v_org_id
    ON CONFLICT (user_id, website_id) DO NOTHING;

    -- Output results
    RAISE NOTICE 'Updated user % to admin and granted website access', v_user_id;
END;
$$;

-- Run the function
SELECT setup_initial_admin();

-- Verify the results
SELECT 
    up.email,
    up.role,
    COUNT(wa.id) as website_access_count,
    STRING_AGG(w.name, ', ') as website_names
FROM user_profiles up
LEFT JOIN website_access wa ON wa.user_id = up.id
LEFT JOIN websites w ON w.id = wa.website_id
WHERE up.email IN ('philipleth+test4@gmail.com', 'philipleth@gmail.com')
GROUP BY up.email, up.role; 