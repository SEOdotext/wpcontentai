-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can update team members in their organization" ON public.user_profiles;

-- Create the correct policy
CREATE POLICY "Users can update team members in their organization" ON public.user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() 
      AND up.organisation_id = organisation_id
    )
  );

-- Check the updated policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'user_profiles' AND policyname = 'Users can update team members in their organization'; 