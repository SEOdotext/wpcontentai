-- Add diagnostic function for Supabase email configuration
-- This function checks email settings and logs diagnostic information

-- Create a function to check email configuration and log diagnostic info
CREATE OR REPLACE FUNCTION check_email_configuration()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site_url TEXT;
  v_smtp_host TEXT;
  v_smtp_port TEXT;
  v_smtp_user TEXT;
  v_smtp_pass_set BOOLEAN;
  v_recent_emails JSONB;
  v_email_setting TEXT;
BEGIN
  -- Get site URL
  BEGIN
    v_site_url := current_setting('app.settings.site_url', TRUE);
  EXCEPTION WHEN OTHERS THEN
    v_site_url := 'not set';
  END;
  
  -- Check if SMTP config exists by attempting to read settings
  -- These will be NULL if not configured
  BEGIN
    v_smtp_host := current_setting('auth.smtp.host', TRUE);
  EXCEPTION WHEN OTHERS THEN
    v_smtp_host := NULL;
  END;
  
  BEGIN
    v_smtp_port := current_setting('auth.smtp.port', TRUE);
  EXCEPTION WHEN OTHERS THEN
    v_smtp_port := NULL;
  END;
  
  BEGIN
    v_smtp_user := current_setting('auth.smtp.user', TRUE);
  EXCEPTION WHEN OTHERS THEN
    v_smtp_user := NULL;
  END;
  
  -- Check if password is set (we don't actually get the password)
  BEGIN
    v_smtp_pass_set := current_setting('auth.smtp.pass', TRUE) IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    v_smtp_pass_set := FALSE;
  END;
  
  -- Check email setting (SMTP vs built-in)
  BEGIN
    v_email_setting := current_setting('auth.email.template', TRUE);
  EXCEPTION WHEN OTHERS THEN
    v_email_setting := 'unknown';
  END;
  
  -- Get recent email queue status
  SELECT jsonb_agg(
    jsonb_build_object(
      'email', email,
      'subject', subject,
      'status', status,
      'created_at', created_at
    )
  )
  INTO v_recent_emails
  FROM (
    SELECT email, subject, created_at, 
      CASE 
        WHEN sent_at IS NOT NULL THEN 'sent' 
        ELSE 'pending' 
      END as status
    FROM auth.emails
    ORDER BY created_at DESC
    LIMIT 5
  ) recent;
  
  -- Log diagnostic info
  RAISE LOG 'EMAIL DIAGNOSTIC: Site URL: %, SMTP configured: %', 
    v_site_url, 
    (v_smtp_host IS NOT NULL AND v_smtp_port IS NOT NULL AND v_smtp_user IS NOT NULL);
  
  -- Return a JSON object with all diagnostic info
  RETURN jsonb_build_object(
    'site_url', v_site_url,
    'smtp_configured', (v_smtp_host IS NOT NULL AND v_smtp_port IS NOT NULL AND v_smtp_user IS NOT NULL),
    'smtp_host', v_smtp_host,
    'smtp_port', v_smtp_port,
    'smtp_user', v_smtp_user,
    'smtp_pass_set', v_smtp_pass_set,
    'email_setting', v_email_setting,
    'recent_emails', v_recent_emails
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_email_configuration TO authenticated; 