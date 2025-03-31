-- Create a function to update a user's role in an organization
CREATE OR REPLACE FUNCTION update_user_role(
  p_user_id UUID,
  p_organisation_id UUID,
  p_new_role TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check if the user exists in the organization
  IF NOT EXISTS (
    SELECT 1 FROM organisation_memberships
    WHERE member_id = p_user_id AND organisation_id = p_organisation_id
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User is not a member of this organization'
    );
  END IF;

  -- Update the user's role
  UPDATE organisation_memberships
  SET role = p_new_role
  WHERE member_id = p_user_id AND organisation_id = p_organisation_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'User role updated successfully',
    'user_id', p_user_id,
    'organisation_id', p_organisation_id,
    'new_role', p_new_role
  );
END;
$$; 