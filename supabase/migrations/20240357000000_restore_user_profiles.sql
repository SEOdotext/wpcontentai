-- Recreate the user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    first_name text,
    last_name text,
    role text NOT NULL DEFAULT 'member',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view profiles in their organization"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM organisation_memberships om
            WHERE om.member_id = user_profiles.id
            AND EXISTS (
                SELECT 1
                FROM organisation_memberships
                WHERE member_id = auth.uid()
                AND organisation_id = om.organisation_id
            )
        )
    );

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Allow creating new user profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 