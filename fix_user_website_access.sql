-- First, let's get the user's ID and current role
DO $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
BEGIN
    -- Get the user ID and org ID for philipleth+test4@gmail.com
    SELECT id, organisation_id INTO v_user_id, v_org_id
    FROM user_profiles
    WHERE email = 'philipleth+test4@gmail.com';

    -- Output the current state
    RAISE NOTICE 'User ID: %, Organization ID: %', v_user_id, v_org_id;
    
    -- Update user role to admin if needed
    UPDATE user_profiles
    SET role = 'admin'
    WHERE id = v_user_id;

    -- Delete any existing website access entries for this user
    DELETE FROM website_access
    WHERE user_id = v_user_id;

    -- Insert website access entries for all websites in the organization
    INSERT INTO website_access (user_id, website_id)
    SELECT v_user_id, id
    FROM websites
    WHERE organisation_id = v_org_id;

    -- Output the number of websites access was granted to
    RAISE NOTICE 'Access granted to % websites', 
        (SELECT COUNT(*) FROM website_access WHERE user_id = v_user_id);
END $$;

-- Verify the results
SELECT 
    up.email,
    up.role,
    COUNT(wa.id) as website_access_count,
    STRING_AGG(w.name, ', ') as website_names
FROM user_profiles up
LEFT JOIN website_access wa ON wa.user_id = up.id
LEFT JOIN websites w ON w.id = wa.website_id
WHERE up.email = 'philipleth+test4@gmail.com'
GROUP BY up.email, up.role; 