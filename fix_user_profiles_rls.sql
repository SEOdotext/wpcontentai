-- Add RLS policy to allow users to insert new team members in their organization
CREATE POLICY "Users can insert team members in their organization" ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.organisation_id = organisation_id
    )
  );

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