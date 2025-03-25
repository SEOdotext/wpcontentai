-- Add RLS policy to allow users to insert team members in their organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can insert team members in their organization'
  ) THEN
    CREATE POLICY "Users can insert team members in their organization" ON public.user_profiles
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid() 
          AND up.organisation_id = organisation_id
        )
      );
  END IF;
END
$$;

-- Add RLS policy to allow users to update team members in their organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can update team members in their organization'
  ) THEN
    CREATE POLICY "Users can update team members in their organization" ON public.user_profiles
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid() 
          AND up.organisation_id = organisation_id
        )
      );
  END IF;
END
$$;

-- Make sure all users have a role
UPDATE user_profiles SET role = 'admin' WHERE role IS NULL OR role = '';

-- Check existing policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'user_profiles'; 