-- Drop all policies that depend on organisation_id first
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage users in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert team members in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can view publication settings for their company" ON publication_settings;
DROP POLICY IF EXISTS "Users can update publication settings for their company" ON publication_settings;
DROP POLICY IF EXISTS "Users can view websites in their organization" ON websites;
DROP POLICY IF EXISTS "Users can insert websites in their organization" ON websites;
DROP POLICY IF EXISTS "Users can update websites in their organization" ON websites;
DROP POLICY IF EXISTS "Users can delete websites in their organization" ON websites;
DROP POLICY IF EXISTS "Users can view categories for their websites" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can insert categories for their websites" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can update categories for their websites" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can delete categories for their websites" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can view their own WordPress settings" ON wordpress_settings;
DROP POLICY IF EXISTS "Users can insert WordPress settings for their websites" ON wordpress_settings;
DROP POLICY IF EXISTS "Users can update their WordPress settings" ON wordpress_settings;
DROP POLICY IF EXISTS "Users can delete their WordPress settings" ON wordpress_settings;
DROP POLICY IF EXISTS "select_website_content" ON website_content;
DROP POLICY IF EXISTS "insert_website_content" ON website_content;
DROP POLICY IF EXISTS "update_website_content" ON website_content;
DROP POLICY IF EXISTS "delete_website_content" ON website_content;
DROP POLICY IF EXISTS "post_themes_all_operations" ON post_themes;
DROP POLICY IF EXISTS "Users can view website access for their organization" ON website_access;
DROP POLICY IF EXISTS "Admin users can insert website access for their organization" ON website_access;
DROP POLICY IF EXISTS "Admin users can update website access for their organization" ON website_access;
DROP POLICY IF EXISTS "Admin users can delete website access for their organization" ON website_access;
DROP POLICY IF EXISTS "Users can update AI image generation setting for their websites" ON websites;
DROP POLICY IF EXISTS "Users can update their own organisation" ON organisations;
DROP POLICY IF EXISTS "Users can view their own organisation" ON organisations;
DROP POLICY IF EXISTS "organisations_select_policy" ON organisations;
DROP POLICY IF EXISTS "organisations_update_policy" ON organisations;
DROP POLICY IF EXISTS "User profile update policy" ON user_profiles;

-- Drop triggers that depend on organisation_id
DROP TRIGGER IF EXISTS handle_user_profile_changes_trigger ON user_profiles;

-- Drop functions that depend on organisation_id
DROP FUNCTION IF EXISTS handle_user_profile_changes() CASCADE;
DROP FUNCTION IF EXISTS check_user_in_organization(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS check_user_is_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS user_has_website_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS setup_initial_admin() CASCADE;

-- Drop foreign key constraints
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_organisation_id_fkey;
ALTER TABLE publication_settings DROP CONSTRAINT IF EXISTS publication_settings_organisation_id_fkey;
ALTER TABLE websites DROP CONSTRAINT IF EXISTS websites_organisation_id_fkey;

-- Create organisations table first
CREATE TABLE IF NOT EXISTS organisations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_profiles table with organisation_id
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'user',
    organisation_id uuid REFERENCES organisations(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create websites table
CREATE TABLE IF NOT EXISTS websites (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    organisation_id uuid REFERENCES organisations(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create publication_settings table
CREATE TABLE IF NOT EXISTS publication_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    website_id uuid REFERENCES websites(id) ON DELETE CASCADE,
    organisation_id uuid REFERENCES organisations(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create wordpress_settings table
CREATE TABLE IF NOT EXISTS wordpress_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    website_id uuid REFERENCES websites(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create website_content table
CREATE TABLE IF NOT EXISTS website_content (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    website_id uuid REFERENCES websites(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create post_themes table
CREATE TABLE IF NOT EXISTS post_themes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    website_id uuid REFERENCES websites(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create website_access table
CREATE TABLE IF NOT EXISTS website_access (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    website_id uuid REFERENCES websites(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(website_id, user_id)
);

-- Create wordpress_categories table
CREATE TABLE IF NOT EXISTS wordpress_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    website_id uuid REFERENCES websites(id) ON DELETE CASCADE,
    wp_category_id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    parent_id integer,
    count integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(website_id, wp_category_id)
);

-- Create the organisation_memberships table
CREATE TABLE IF NOT EXISTS organisation_memberships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'user',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(member_id, organisation_id)
);

-- Migrate existing data from user_profiles to organisation_memberships
INSERT INTO organisation_memberships (member_id, organisation_id, role)
SELECT id, organisation_id, role
FROM user_profiles
WHERE organisation_id IS NOT NULL
ON CONFLICT (member_id, organisation_id) DO NOTHING;

-- Create policies for organisation_memberships
CREATE POLICY "Users can view their own memberships"
    ON organisation_memberships FOR SELECT
    USING (member_id = auth.uid());

CREATE POLICY "Users can view memberships in their organisations"
    ON organisation_memberships FOR SELECT
    USING (
        organisation_id IN (
            SELECT organisation_id FROM organisation_memberships
            WHERE member_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert themselves into organisations"
    ON organisation_memberships FOR INSERT
    WITH CHECK (member_id = auth.uid());

CREATE POLICY "Admins can manage memberships in their organisations"
    ON organisation_memberships FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organisation_memberships
            WHERE member_id = auth.uid()
            AND organisation_id = organisation_memberships.organisation_id
            AND role = 'admin'
        )
    );

-- Create updated_at trigger
CREATE TRIGGER update_organisation_memberships_updated_at
    BEFORE UPDATE ON organisation_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create the original functions
CREATE OR REPLACE FUNCTION check_user_in_organization(user_id uuid, org_id uuid) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE id = user_id
        AND organisation_id = org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_user_is_admin(user_id uuid, org_id uuid) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE id = user_id
        AND organisation_id = org_id
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the original policies
CREATE POLICY "Users can view profiles in their organization" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up1
            JOIN user_profiles up2 ON up1.organisation_id = up2.organisation_id
            WHERE up1.id = auth.uid() AND up2.id = user_profiles.id
        )
    );

CREATE POLICY "Admins can manage users in their organization" ON user_profiles
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up1
            JOIN user_profiles up2 ON up1.organisation_id = up2.organisation_id
            WHERE up1.id = auth.uid() AND up1.role = 'admin' AND up2.id = user_profiles.id
        )
    );

CREATE POLICY "Users can view websites in their organization" ON websites
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND organisation_id = websites.organisation_id
        )
    );

CREATE POLICY "Users can manage websites in their organization" ON websites
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND organisation_id = websites.organisation_id
        )
    );

CREATE POLICY "Users can manage publication settings for their organization" ON publication_settings
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND organisation_id = publication_settings.organisation_id
        )
    );

CREATE POLICY "Users can manage WordPress settings for their websites" ON wordpress_settings
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            JOIN websites w ON w.organisation_id = up.organisation_id
            WHERE up.id = auth.uid() AND w.id = wordpress_settings.website_id
        )
    );

CREATE POLICY "Users can manage website content" ON website_content
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            JOIN websites w ON w.organisation_id = up.organisation_id
            WHERE up.id = auth.uid() AND w.id = website_content.website_id
        )
    );

CREATE POLICY "Users can manage post themes" ON post_themes
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            JOIN websites w ON w.organisation_id = up.organisation_id
            WHERE up.id = auth.uid() AND w.id = post_themes.website_id
        )
    );

CREATE POLICY "Users can manage website access" ON website_access
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up1
            JOIN user_profiles up2 ON up1.organisation_id = up2.organisation_id
            JOIN websites w ON w.organisation_id = up1.organisation_id
            WHERE up1.id = auth.uid() AND up1.role = 'admin'
            AND up2.id = website_access.user_id AND w.id = website_access.website_id
        )
    );

CREATE POLICY "Users can manage their own organisation" ON organisations
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND organisation_id = organisations.id
        )
    );

-- Now we can safely drop the columns
ALTER TABLE user_profiles DROP COLUMN IF EXISTS organisation_id;

-- Create a view for American spelling
CREATE OR REPLACE VIEW organization_memberships AS
    SELECT 
        id,
        member_id as user_id,
        organisation_id,
        role,
        created_at,
        updated_at
    FROM organisation_memberships;

-- Grant access to the view
GRANT SELECT ON organization_memberships TO authenticated;
GRANT INSERT ON organization_memberships TO authenticated;
GRANT UPDATE ON organization_memberships TO authenticated;
GRANT DELETE ON organization_memberships TO authenticated;
