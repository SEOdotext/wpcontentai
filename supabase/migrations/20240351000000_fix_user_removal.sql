-- Function to properly remove a user from an organization
CREATE OR REPLACE FUNCTION remove_user_from_organisation(
  p_user_id UUID,
  p_organisation_id UUID
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

  -- Remove website access for this user within the organization
  WITH org_websites AS (
    SELECT id FROM websites WHERE organisation_id = p_organisation_id
  )
  DELETE FROM website_access
  WHERE user_id = p_user_id
  AND website_id IN (SELECT id FROM org_websites);

  -- Remove organization membership
  DELETE FROM organisation_memberships
  WHERE member_id = p_user_id AND organisation_id = p_organisation_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'User removed from organization successfully'
  );
END;
$$;

-- Update the existing handle_user_deletion function to ensure it properly cleans up organization memberships
CREATE OR REPLACE FUNCTION handle_user_deletion() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove all website access
  DELETE FROM website_access WHERE user_id = OLD.id;
  
  -- Remove all organization memberships
  DELETE FROM organisation_memberships WHERE member_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- No need to create a trigger - it already exists as 'on_user_deleted'
-- The following code block can be uncommented if you need to create the trigger in the future
/*
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_user_deleted' 
  ) THEN
    CREATE TRIGGER on_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();
  END IF;
END;
$$;
*/ 