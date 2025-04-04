-- Fix email sending in Supabase
-- This migration updates the send_invitation_email function to properly handle email sending

-- Drop existing function
DROP FUNCTION IF EXISTS send_invitation_email;

-- Create improved function that properly handles email sending using Supabase's auth.emails table
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
  v_token TEXT;
  v_confirmation_url TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Get organization name
  SELECT name INTO v_organisation_name
  FROM organisations
  WHERE id = p_organisation_id;
  
  -- Generate a confirmation token
  v_token := encode(gen_random_bytes(32), 'hex');
  
  -- Create a confirmation link
  v_confirmation_url := current_setting('app.settings.site_url') || '/auth/callback?token=' || v_token;
  
  -- Log the email sending request (for debugging)
  RAISE LOG 'INVITATION EMAIL: Sending email to % for organization % (New user: %)', 
      v_user_email, v_organisation_name, p_is_new_user;
      
  -- Use Supabase's internal email functionality
  -- This only works if email is properly configured in Supabase settings
  INSERT INTO auth.emails (
    email,
    subject,
    content,
    created_at
  ) VALUES (
    v_user_email,
    'Invitation to join ' || v_organisation_name,
    'You have been invited to join ' || v_organisation_name || ' on WP Content AI. Click here to accept: ' || v_confirmation_url,
    now()
  );
  
  -- Return success response
  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Invitation email sent to ' || v_user_email || ' for ' || v_organisation_name
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION send_invitation_email TO authenticated; 