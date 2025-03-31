-- Create a function to retrieve team data
CREATE OR REPLACE FUNCTION get_team_data(organisation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH org_members AS (
    SELECT 
      om.id as membership_id,
      om.member_id as user_id,
      om.role,
      om.created_at,
      au.email
    FROM 
      organisation_memberships om
      INNER JOIN auth.users au ON om.member_id = au.id
    WHERE 
      om.organisation_id = get_team_data.organisation_id
  ),
  website_access_data AS (
    SELECT 
      wa.user_id,
      jsonb_agg(
        jsonb_build_object(
          'id', wa.id,
          'website_id', wa.website_id,
          'created_at', wa.created_at,
          'website', jsonb_build_object(
            'id', w.id,
            'name', w.name,
            'url', w.url
          )
        )
      ) as access
    FROM 
      website_access wa
      JOIN websites w ON wa.website_id = w.id
    WHERE 
      wa.user_id IN (SELECT user_id FROM org_members)
    GROUP BY 
      wa.user_id
  )
  SELECT 
    jsonb_build_object(
      'team_members', (
        SELECT 
          jsonb_agg(
            jsonb_build_object(
              'id', om.user_id,
              'email', om.email,
              'first_name', '',
              'last_name', '',
              'role', om.role,
              'created_at', om.created_at,
              'organisation_id', get_team_data.organisation_id,
              'website_access', COALESCE(wa.access, '[]'::jsonb)
            )
          )
        FROM 
          org_members om
          LEFT JOIN website_access_data wa ON om.user_id = wa.user_id
      )
    ) INTO result;

  RETURN result;
END;
$$; 