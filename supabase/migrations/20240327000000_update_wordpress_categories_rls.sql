-- Drop existing policies
DROP POLICY IF EXISTS "Users can view categories for their websites" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can insert categories for their websites" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can update categories for their websites" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can delete categories for their websites" ON wordpress_categories;

-- Create new policies using the correct access pattern
CREATE POLICY "Users can view categories for their websites"
    ON wordpress_categories FOR SELECT
    USING (
        website_id IN (
            SELECT w.id FROM websites w
            JOIN user_profiles up ON up.organisation_id = w.organisation_id
            WHERE up.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert categories for their websites"
    ON wordpress_categories FOR INSERT
    WITH CHECK (
        website_id IN (
            SELECT w.id FROM websites w
            JOIN user_profiles up ON up.organisation_id = w.organisation_id
            WHERE up.id = auth.uid()
        )
    );

CREATE POLICY "Users can update categories for their websites"
    ON wordpress_categories FOR UPDATE
    USING (
        website_id IN (
            SELECT w.id FROM websites w
            JOIN user_profiles up ON up.organisation_id = w.organisation_id
            WHERE up.id = auth.uid()
        )
    );

CREATE POLICY "Users can delete categories for their websites"
    ON wordpress_categories FOR DELETE
    USING (
        website_id IN (
            SELECT w.id FROM websites w
            JOIN user_profiles up ON up.organisation_id = w.organisation_id
            WHERE up.id = auth.uid()
        )
    ); 