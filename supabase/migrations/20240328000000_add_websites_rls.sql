-- Enable Row Level Security on the websites table
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view websites in their organization" ON websites;
DROP POLICY IF EXISTS "Users can insert websites in their organization" ON websites;
DROP POLICY IF EXISTS "Users can update websites in their organization" ON websites;
DROP POLICY IF EXISTS "Users can delete websites in their organization" ON websites;

-- Policy for selecting websites (users can only see websites in their organization)
CREATE POLICY "Users can view websites in their organization"
    ON websites FOR SELECT
    USING (
        organisation_id IN (
            SELECT organisation_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

-- Policy for inserting websites (users can only insert websites in their organization)
CREATE POLICY "Users can insert websites in their organization"
    ON websites FOR INSERT
    WITH CHECK (
        organisation_id IN (
            SELECT organisation_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

-- Policy for updating websites (users can only update websites in their organization)
CREATE POLICY "Users can update websites in their organization"
    ON websites FOR UPDATE
    USING (
        organisation_id IN (
            SELECT organisation_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

-- Policy for deleting websites (users can only delete websites in their organization)
CREATE POLICY "Users can delete websites in their organization"
    ON websites FOR DELETE
    USING (
        organisation_id IN (
            SELECT organisation_id FROM user_profiles
            WHERE id = auth.uid()
        )
    ); 