-- Enable RLS if not already enabled
ALTER TABLE public.website_access ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view website access for their organization" ON public.website_access;
DROP POLICY IF EXISTS "Admin users can insert website access for their organization" ON public.website_access;
DROP POLICY IF EXISTS "Admin users can update website access for their organization" ON public.website_access;
DROP POLICY IF EXISTS "Admin users can delete website access for their organization" ON public.website_access;

-- Create policies
CREATE POLICY "Users can view website access for their organization" ON public.website_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships om1
      JOIN public.organisation_memberships om2 ON om1.organisation_id = om2.organisation_id
      WHERE om1.member_id = auth.uid() AND om2.member_id = user_id
    )
  );

CREATE POLICY "Admin users can insert website access for their organization" ON public.website_access
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships om1
      JOIN public.organisation_memberships om2 ON om1.organisation_id = om2.organisation_id
      WHERE om1.member_id = auth.uid() AND om1.role = 'admin' AND om2.member_id = user_id
    )
  );

CREATE POLICY "Admin users can update website access for their organization" ON public.website_access
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships om1
      JOIN public.organisation_memberships om2 ON om1.organisation_id = om2.organisation_id
      WHERE om1.member_id = auth.uid() AND om1.role = 'admin' AND om2.member_id = user_id
    )
  );

CREATE POLICY "Admin users can delete website access for their organization" ON public.website_access
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships om1
      JOIN public.organisation_memberships om2 ON om1.organisation_id = om2.organisation_id
      WHERE om1.member_id = auth.uid() AND om1.role = 'admin' AND om2.member_id = user_id
    )
  );

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.user_has_website_access(UUID);

-- Create the user_has_website_access function
CREATE OR REPLACE FUNCTION public.user_has_website_access(website_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the user's role from organisation_memberships
  SELECT role INTO user_role 
  FROM organisation_memberships om
  JOIN websites w ON w.organisation_id = om.organisation_id
  WHERE om.member_id = auth.uid() AND w.id = website_id
  LIMIT 1;
  
  -- Admin users have access to all websites in their organization
  IF user_role = 'admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM websites w
      JOIN organisation_memberships om ON om.organisation_id = w.organisation_id
      WHERE w.id = website_id AND om.member_id = auth.uid()
    );
  END IF;
  
  -- Regular members need explicit access
  RETURN EXISTS (
    SELECT 1 FROM website_access wa
    WHERE wa.website_id = website_id AND wa.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure all users have a role
UPDATE user_profiles SET role = 'member' WHERE role IS NULL OR role = ''; 