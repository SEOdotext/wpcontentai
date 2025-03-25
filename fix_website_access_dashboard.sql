-- Check if website_access table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'website_access'
  ) THEN
    -- Create website_access table
    CREATE TABLE public.website_access (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, website_id)
    );

    -- Enable RLS
    ALTER TABLE public.website_access ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can view website access for their organization" ON public.website_access
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up1
          JOIN public.user_profiles up2 ON up1.organisation_id = up2.organisation_id
          WHERE up1.id = auth.uid() AND up2.id = user_id
        )
      );

    CREATE POLICY "Admin users can insert website access for their organization" ON public.website_access
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles up1
          JOIN public.user_profiles up2 ON up1.organisation_id = up2.organisation_id
          WHERE up1.id = auth.uid() AND up1.role = 'admin' AND up2.id = user_id
        )
      );

    CREATE POLICY "Admin users can update website access for their organization" ON public.website_access
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up1
          JOIN public.user_profiles up2 ON up1.organisation_id = up2.organisation_id
          WHERE up1.id = auth.uid() AND up1.role = 'admin' AND up2.id = user_id
        )
      );

    CREATE POLICY "Admin users can delete website access for their organization" ON public.website_access
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up1
          JOIN public.user_profiles up2 ON up1.organisation_id = up2.organisation_id
          WHERE up1.id = auth.uid() AND up1.role = 'admin' AND up2.id = user_id
        )
      );
  END IF;
END
$$;

-- Create or replace the user_has_website_access function
CREATE OR REPLACE FUNCTION public.user_has_website_access(website_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the user's role
  SELECT role INTO user_role FROM user_profiles WHERE id = auth.uid();
  
  -- Admin users have access to all websites in their organization
  IF user_role = 'admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM websites w
      JOIN user_profiles up ON w.organisation_id = up.organisation_id
      WHERE w.id = website_id AND up.id = auth.uid()
    );
  END IF;
  
  -- Regular members need explicit access
  RETURN EXISTS (
    SELECT 1 FROM website_access wa
    WHERE wa.website_id = website_id AND wa.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure all users have a role
UPDATE user_profiles SET role = 'admin' WHERE role IS NULL OR role = '';

-- Check if the table was created
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'website_access'
) AS website_access_table_exists; 