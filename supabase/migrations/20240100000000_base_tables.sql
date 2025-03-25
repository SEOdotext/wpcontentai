-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organisations table
CREATE TABLE IF NOT EXISTS organisations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create websites table
CREATE TABLE IF NOT EXISTS websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organisations
CREATE POLICY "Users can view their own organisation" ON organisations
  FOR SELECT
  USING (
    id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own organisation" ON organisations
  FOR UPDATE
  USING (
    id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT
  USING (
    id = auth.uid() OR
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE
  USING (
    id = auth.uid()
  );

-- Create RLS policies for websites
CREATE POLICY "Users can view websites in their organization" ON websites
  FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert websites in their organization" ON websites
  FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update websites in their organization" ON websites
  FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete websites in their organization" ON websites
  FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Create helper functions
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS SETOF user_profiles AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM user_profiles
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_profile_by_id(user_id UUID)
RETURNS SETOF user_profiles AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM user_profiles
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM user_profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 