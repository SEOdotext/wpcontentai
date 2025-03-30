-- Drop existing policies
DROP POLICY IF EXISTS "Users can view post theme categories" ON post_theme_categories;
DROP POLICY IF EXISTS "Users can insert post theme categories" ON post_theme_categories;
DROP POLICY IF EXISTS "Users can delete post theme categories" ON post_theme_categories;

-- Create new policies using organization-based access control
CREATE POLICY "Users can view post theme categories"
ON post_theme_categories FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM post_themes pt
    JOIN websites w ON w.id = pt.website_id
    JOIN organisation_memberships om ON om.organisation_id = w.organisation_id
    WHERE om.member_id = auth.uid()
    AND pt.id = post_theme_categories.post_theme_id
  )
);

CREATE POLICY "Users can insert post theme categories"
ON post_theme_categories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM post_themes pt
    JOIN websites w ON w.id = pt.website_id
    JOIN organisation_memberships om ON om.organisation_id = w.organisation_id
    WHERE om.member_id = auth.uid()
    AND pt.id = post_theme_categories.post_theme_id
  )
);

CREATE POLICY "Users can delete post theme categories"
ON post_theme_categories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM post_themes pt
    JOIN websites w ON w.id = pt.website_id
    JOIN organisation_memberships om ON om.organisation_id = w.organisation_id
    WHERE om.member_id = auth.uid()
    AND pt.id = post_theme_categories.post_theme_id
  )
); 