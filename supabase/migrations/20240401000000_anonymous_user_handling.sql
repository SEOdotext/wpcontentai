-- Function to handle anonymous user creation
CREATE OR REPLACE FUNCTION handle_new_anonymous_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user is anonymous from metadata
  IF NEW.raw_user_meta_data->>'is_anonymous' = 'true' THEN
    -- Log this event
    INSERT INTO logs (event, user_id, details)
    VALUES ('anonymous_user_created', NEW.id, json_build_object('email', NEW.email));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_anonymous_user_created ON auth.users;
CREATE TRIGGER on_anonymous_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_anonymous_user();

-- Ensure logs table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'logs') THEN
    CREATE TABLE logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event TEXT NOT NULL,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );

    -- Add an index on the event column
    CREATE INDEX idx_logs_event ON logs(event);

    -- Add RLS for logs table
    ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Only allow service_role and authenticated admin users to view logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'logs' 
    AND policyname = 'Service role can do everything with logs'
  ) THEN
    CREATE POLICY "Service role can do everything with logs" ON logs
      FOR ALL 
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Function to check if an account is anonymous (for future use)
CREATE OR REPLACE FUNCTION is_anonymous_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_anon BOOLEAN;
BEGIN
  SELECT (raw_user_meta_data->>'is_anonymous' = 'true') INTO is_anon
  FROM auth.users
  WHERE id = user_id;
  
  RETURN COALESCE(is_anon, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 