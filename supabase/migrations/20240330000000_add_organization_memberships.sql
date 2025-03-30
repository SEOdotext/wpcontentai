-- Create organization_memberships table
CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, organisation_id)
);

-- Add indexes for better performance
CREATE INDEX organization_memberships_user_id_idx ON organization_memberships(user_id);
CREATE INDEX organization_memberships_organisation_id_idx ON organization_memberships(organisation_id);

-- Enable RLS
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- Create policies for organization_memberships
CREATE POLICY "Users can view their own memberships"
    ON organization_memberships FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view memberships in their organizations"
    ON organization_memberships FOR SELECT
    USING (
        organisation_id IN (
            SELECT organisation_id FROM organization_memberships
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert themselves into organizations"
    ON organization_memberships FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage memberships in their organizations"
    ON organization_memberships FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE user_id = auth.uid()
            AND organisation_id = organization_memberships.organisation_id
            AND role = 'admin'
        )
    );

-- Create updated_at trigger
CREATE TRIGGER update_organization_memberships_updated_at
    BEFORE UPDATE ON organization_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data
INSERT INTO organization_memberships (user_id, organisation_id, role)
SELECT 
    id, 
    organisation_id, 
    CASE 
        WHEN role = 'admin' THEN 'admin'
        ELSE 'member'
    END
FROM user_profiles
WHERE organisation_id IS NOT NULL;

-- Drop all policies that depend on user_profiles.organisation_id and the functions
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage users in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can view publication settings for their company" ON publication_settings;
DROP POLICY IF EXISTS "Users can update publication settings for their company" ON publication_settings;
DROP POLICY IF EXISTS "organisations_select_policy" ON organisations;
DROP POLICY IF EXISTS "organisations_update_policy" ON organisations;
DROP POLICY IF EXISTS "Users can view their own WordPress settings" ON wordpress_settings;
DROP POLICY IF EXISTS "Users can insert WordPress settings for their websites" ON wordpress_settings;
DROP POLICY IF EXISTS "Users can update their WordPress settings" ON wordpress_settings;
DROP POLICY IF EXISTS "Users can delete their WordPress settings" ON wordpress_settings;
DROP POLICY IF EXISTS "select_website_content" ON website_content;
DROP POLICY IF EXISTS "insert_website_content" ON website_content;
DROP POLICY IF EXISTS "update_website_content" ON website_content;
DROP POLICY IF EXISTS "delete_website_content" ON website_content;
DROP POLICY IF EXISTS "post_themes_all_operations" ON post_themes;
DROP POLICY IF EXISTS "Users can insert team members in their organization" ON user_profiles;
DROP POLICY IF EXISTS "User profile update policy" ON user_profiles;
DROP POLICY IF EXISTS "Users can update AI image generation setting for their websites" ON websites;
DROP POLICY IF EXISTS "Users can view their own organisation" ON organisations;
DROP POLICY IF EXISTS "Users can update their own organisation" ON organisations;
DROP POLICY IF EXISTS "Users can view categories for their websites" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can insert categories for their websites" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can update categories for their websites" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can delete categories for their websites" ON wordpress_categories;
DROP POLICY IF EXISTS "Users can view websites in their organization" ON websites;
DROP POLICY IF EXISTS "Users can insert websites in their organization" ON websites;
DROP POLICY IF EXISTS "Users can update websites in their organization" ON websites;
DROP POLICY IF EXISTS "Users can delete websites in their organization" ON websites;

-- Now we can safely drop the functions
DROP FUNCTION IF EXISTS check_user_in_organization(uuid, uuid);
DROP FUNCTION IF EXISTS check_user_is_admin(uuid, uuid);

-- Update the check_user_in_organization function
CREATE OR REPLACE FUNCTION check_user_in_organization(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM organization_memberships
        WHERE user_id = p_user_id
        AND organisation_id = p_org_id
    );
END;
$$;

-- Update the check_user_is_admin function
CREATE OR REPLACE FUNCTION check_user_is_admin(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM organization_memberships
        WHERE user_id = p_user_id
        AND organisation_id = p_org_id
        AND role = 'admin'
    );
END;
$$;

-- Update the user_has_website_access function
CREATE OR REPLACE FUNCTION user_has_website_access(website_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get the user's role for the website's organization
    SELECT om.role INTO user_role
    FROM websites w
    JOIN organization_memberships om ON om.organisation_id = w.organisation_id
    WHERE w.id = website_id AND om.user_id = auth.uid();
    
    -- Admin users have access to all websites in their organization
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Regular members need explicit access
    RETURN EXISTS (
        SELECT 1 FROM website_access wa
        WHERE wa.website_id = website_id AND wa.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update website access policies
DROP POLICY IF EXISTS "Users can view website access for their organization" ON website_access;
DROP POLICY IF EXISTS "Admin users can insert website access for their organization" ON website_access;
DROP POLICY IF EXISTS "Admin users can update website access for their organization" ON website_access;
DROP POLICY IF EXISTS "Admin users can delete website access for their organization" ON website_access;

CREATE POLICY "Users can view website access for their organization" ON website_access
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Admin users can insert website access for their organization" ON website_access
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = website_id AND om.user_id = auth.uid() AND om.role = 'admin'
        )
    );

CREATE POLICY "Admin users can update website access for their organization" ON website_access
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = website_id AND om.user_id = auth.uid() AND om.role = 'admin'
        )
    );

CREATE POLICY "Admin users can delete website access for their organization" ON website_access
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = website_id AND om.user_id = auth.uid() AND om.role = 'admin'
        )
    );

-- Recreate the policies with the new organization_memberships table
CREATE POLICY "Users can view publication settings for their company" ON publication_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = publication_settings.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update publication settings for their company" ON publication_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = publication_settings.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "organisations_select_policy" ON organisations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE organisation_id = organisations.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "organisations_update_policy" ON organisations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE organisation_id = organisations.id AND user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view their own WordPress settings" ON wordpress_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = wordpress_settings.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert WordPress settings for their websites" ON wordpress_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = wordpress_settings.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their WordPress settings" ON wordpress_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = wordpress_settings.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their WordPress settings" ON wordpress_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = wordpress_settings.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "select_website_content" ON website_content
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = website_content.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "insert_website_content" ON website_content
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = website_content.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "update_website_content" ON website_content
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = website_content.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "delete_website_content" ON website_content
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = website_content.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "post_themes_all_operations" ON post_themes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = post_themes.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert team members in their organization" ON user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "User profile update policy" ON user_profiles
    FOR UPDATE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update AI image generation setting for their websites" ON websites
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE organisation_id = websites.organisation_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own organisation" ON organisations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE organisation_id = organisations.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own organisation" ON organisations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE organisation_id = organisations.id AND user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view categories for their websites" ON wordpress_categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = wordpress_categories.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert categories for their websites" ON wordpress_categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = wordpress_categories.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update categories for their websites" ON wordpress_categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = wordpress_categories.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete categories for their websites" ON wordpress_categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM websites w
            JOIN organization_memberships om ON om.organisation_id = w.organisation_id
            WHERE w.id = wordpress_categories.website_id AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view websites in their organization" ON websites
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE organisation_id = websites.organisation_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert websites in their organization" ON websites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE organisation_id = websites.organisation_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update websites in their organization" ON websites
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE organisation_id = websites.organisation_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete websites in their organization" ON websites
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM organization_memberships
            WHERE organisation_id = websites.organisation_id AND user_id = auth.uid()
        )
    ); 