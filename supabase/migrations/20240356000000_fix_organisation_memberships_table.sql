-- Drop the incorrectly named table if it exists
DROP TABLE IF EXISTS organization_memberships;

-- Ensure the correct table exists with proper name
CREATE TABLE IF NOT EXISTS organisation_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(member_id, organisation_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS organisation_memberships_member_id_idx ON organisation_memberships(member_id);
CREATE INDEX IF NOT EXISTS organisation_memberships_organisation_id_idx ON organisation_memberships(organisation_id);

-- Enable RLS
ALTER TABLE organisation_memberships ENABLE ROW LEVEL SECURITY; 