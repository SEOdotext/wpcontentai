-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can update team members in their organization" ON public.user_profiles;

-- Create the correct policy with a different approach
CREATE POLICY "Admin users can update team members in their org" ON public.user_profiles
  FOR UPDATE
  USING (
    (SELECT organisation_id FROM user_profiles WHERE id = auth.uid()) = organisation_id
    AND
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
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
WHERE tablename = 'user_profiles' AND policyname = 'Admin users can update team members in their org'; 