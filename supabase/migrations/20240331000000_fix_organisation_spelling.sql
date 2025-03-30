-- Drop the American view if it exists
DROP VIEW IF EXISTS organization_memberships;

-- Drop existing policies that use American spelling (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_memberships') THEN
        DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_memberships;
        DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON organization_memberships;
        DROP POLICY IF EXISTS "Users can insert themselves into organizations" ON organization_memberships;
        DROP POLICY IF EXISTS "Admins can manage memberships in their organizations" ON organization_memberships;
    END IF;
END $$;

-- Drop existing policies that use British spelling (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organisation_memberships') THEN
        DROP POLICY IF EXISTS "Users can view their own memberships" ON organisation_memberships;
        DROP POLICY IF EXISTS "Users can view memberships in their organisations" ON organisation_memberships;
        DROP POLICY IF EXISTS "Users can insert themselves into organisations" ON organisation_memberships;
        DROP POLICY IF EXISTS "Admins can manage memberships in their organisations" ON organisation_memberships;
    END IF;
END $$;

-- Drop existing indexes (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_memberships') THEN
        DROP INDEX IF EXISTS organization_memberships_user_id_idx;
        DROP INDEX IF EXISTS organization_memberships_organisation_id_idx;
    END IF;
END $$;

-- Drop existing indexes with British spelling (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organisation_memberships') THEN
        DROP INDEX IF EXISTS organisation_memberships_member_id_idx;
        DROP INDEX IF EXISTS organisation_memberships_organisation_id_idx;
    END IF;
END $$;

-- Drop existing trigger (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_memberships') THEN
        DROP TRIGGER IF EXISTS update_organization_memberships_updated_at ON organization_memberships;
    END IF;
END $$;

-- Drop existing trigger with British spelling (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organisation_memberships') THEN
        DROP TRIGGER IF EXISTS update_organisation_memberships_updated_at ON organisation_memberships;
    END IF;
END $$;

-- Create the table with British spelling if it doesn't exist
CREATE TABLE IF NOT EXISTS organisation_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(member_id, organisation_id)
);

-- Create indexes with correct spelling
CREATE INDEX IF NOT EXISTS organisation_memberships_member_id_idx ON organisation_memberships(member_id);
CREATE INDEX IF NOT EXISTS organisation_memberships_organisation_id_idx ON organisation_memberships(organisation_id);

-- Enable RLS
ALTER TABLE organisation_memberships ENABLE ROW LEVEL SECURITY;

-- Create policies with correct spelling
-- Policy for viewing own memberships
CREATE POLICY "Users can view their own memberships"
    ON organisation_memberships FOR SELECT
    USING (member_id = auth.uid());

-- Policy for inserting new memberships
CREATE POLICY "Users can insert themselves into organisations"
    ON organisation_memberships FOR INSERT
    WITH CHECK (member_id = auth.uid());

-- Policy for admins to manage memberships
CREATE POLICY "Admins can manage memberships in their organisations"
    ON organisation_memberships FOR ALL
    USING (
        member_id = auth.uid() 
        AND role = 'admin'
    );

-- Create updated_at trigger with correct spelling
CREATE TRIGGER update_organisation_memberships_updated_at
    BEFORE UPDATE ON organisation_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON organisation_memberships TO authenticated;
GRANT INSERT ON organisation_memberships TO authenticated;
GRANT UPDATE ON organisation_memberships TO authenticated;
GRANT DELETE ON organisation_memberships TO authenticated; 