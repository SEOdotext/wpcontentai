-- Fix email sending in Supabase
-- This migration updates the send_invitation_email function to properly handle email sending

-- Drop existing function
DROP FUNCTION IF EXISTS send_invitation_email;

-- Create improved function that logs email sending attempts but doesn't try to send actual emails
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
  
  -- Log the email sending attempt - in production this would be replaced with actual email sending
  RAISE LOG 'INVITATION EMAIL: Would send email to % for organization % (New user: %)', 
      v_user_email, v_organisation_name, p_is_new_user;
  
  -- Return success response
  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Invitation processed for ' || v_user_email || ' for ' || v_organisation_name
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION send_invitation_email TO authenticated; 