-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view wordpress categories" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can manage wordpress categories" ON wordpress_categories;

-- Enable RLS on wordpress_categories if not already enabled
ALTER TABLE wordpress_categories ENABLE ROW LEVEL SECURITY;

-- Policy for viewing WordPress categories for websites the user has access to
CREATE POLICY "Users can view wordpress categories" 
ON wordpress_categories
FOR SELECT 
USING (
  website_id IN (
    SELECT website_access.website_id 
    FROM website_access 
    WHERE website_access.user_id = auth.uid()
  )
);

-- Policy for managing WordPress categories (all operations) for website admins
CREATE POLICY "Users can manage wordpress categories" 
ON wordpress_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM organisation_memberships om 
    JOIN websites w ON w.organisation_id = om.organisation_id
    WHERE om.member_id = auth.uid() 
    AND w.id = wordpress_categories.website_id
  )
);

-- Log message for migration completion
SELECT 'Added Row Level Security policies for wordpress_categories table'::text;
