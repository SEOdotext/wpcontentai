-- Add a function to invite users directly to an organization without requiring email confirmation
-- This bypasses the email confirmation step and is useful in environments where email sending is unreliable

-- Create function
CREATE OR REPLACE FUNCTION invite_user_to_organisation(
  p_email TEXT,
  p_organisation_id UUID,
  p_role TEXT DEFAULT 'member',
  p_website_ids UUID[] DEFAULT '{}'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
  v_is_new_user BOOLEAN := FALSE;
  v_has_profile BOOLEAN := FALSE;
BEGIN
  -- Check if this email already exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  -- If user doesn't exist in auth, create them directly (with admin privileges)
  -- NOTE: This requires Supabase service_role key to be used
  IF v_user_id IS NULL THEN
    -- For security, we'll just return an error in this case
    -- In the admin console, you can manually create the user first
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User does not exist. Create the user in Authentication > Users first.'
    );
  END IF;
  
  -- Check if user already has a profile
  SELECT EXISTS(
    SELECT 1 FROM user_profiles
    WHERE id = v_user_id
  ) INTO v_has_profile;
  
  -- Check if already a member of the organization
  IF EXISTS (
    SELECT 1 FROM organisation_memberships
    WHERE member_id = v_user_id AND organisation_id = p_organisation_id
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User is already a member of this organization'
    );
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
  
  -- If user is a member and website IDs are provided, grant website access
  IF p_role = 'member' AND array_length(p_website_ids, 1) > 0 THEN
    INSERT INTO website_access (user_id, website_id)
    SELECT v_user_id, website_id
    FROM unnest(p_website_ids) AS website_id;
  END IF;
  
  -- Log the action for audit purposes
  RAISE LOG 'User % invited to organization % with role %', 
    p_email, p_organisation_id, p_role;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'User added to organization successfully',
    'user_id', v_user_id,
    'is_new_user', FALSE
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION invite_user_to_organisation TO authenticated; 