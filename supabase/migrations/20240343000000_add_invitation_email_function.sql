-- Function to handle sending invitation emails
CREATE OR REPLACE FUNCTION send_invitation_email(
  p_user_id UUID,
  p_organisation_id UUID,
  p_is_new_user BOOLEAN
) RETURNS JSONB
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
  -- For now, we'll just return success
  
  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Invitation email would be sent to ' || v_user_email || ' for ' || v_organisation_name
  );
END;
$$; 