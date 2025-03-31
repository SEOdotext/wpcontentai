-- Drop existing function
DROP FUNCTION IF EXISTS handle_organisation_invitation;

-- Re-create the function using organisation_memberships instead of user_profiles
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
  v_result JSONB;
  v_is_new_user BOOLEAN := false;
BEGIN
  -- Check if the user exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User does not exist. Please sign up first.'
    );
  END IF;

  -- Check if the user is already a member of this organization
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

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'User added to organization successfully',
    'user_id', v_user_id,
    'is_new_user', v_is_new_user
  );
END;
$$;

-- Update the send_invitation_email function as well to ensure compatibility
DROP FUNCTION IF EXISTS send_invitation_email;

CREATE OR REPLACE FUNCTION send_invitation_email(
  p_user_id UUID,
  p_organisation_id UUID,
  p_is_new_user BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_organisation_name TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Get organization name
  SELECT name INTO v_organisation_name
  FROM organisations
  WHERE id = p_organisation_id;
  
  -- In a production environment, you would send an actual email here
  -- For now, this is just a placeholder
  
  -- Return void (no return value needed)
  RETURN;
END;
$$; 