-- Drop all existing update policies for user_profiles
DROP POLICY IF EXISTS "Users can update team members in their organization" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin users can update team members in their org" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow update organisation_id" ON public.user_profiles;

-- Create a single, clear policy for updating user profiles
CREATE POLICY "User profile update policy" ON public.user_profiles
  FOR UPDATE
  USING (
    -- Users can update their own profile
    id = auth.uid()
    OR
    -- Admins can update users in their organization
    (
      EXISTS (
        SELECT 1 
        FROM user_profiles admin
        WHERE admin.id = auth.uid() 
          AND admin.role = 'admin'
          AND admin.organisation_id = user_profiles.organisation_id
      )
    )
  );

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert team members in their organization" ON public.user_profiles;

-- Create a clear policy for inserting user profiles
CREATE POLICY "User profile insert policy" ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    -- Users can insert their own profile (for signup)
    id = auth.uid()
    OR
    -- Admins can insert users in their organization
    (
      EXISTS (
        SELECT 1 
        FROM user_profiles admin
        WHERE admin.id = auth.uid() 
          AND admin.role = 'admin'
          AND admin.organisation_id = organisation_id
      )
    )
  );

-- Check all policies for user_profiles
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