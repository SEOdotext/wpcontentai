-- Add credits column to organisations table if it doesn't exist
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 5;

-- Update existing organizations to have 5 credits if they don't have any
UPDATE organisations SET credits = 5 WHERE credits IS NULL;

-- Add trigger to set default credits for new organizations
CREATE OR REPLACE FUNCTION set_default_credits()
RETURNS TRIGGER AS $$
BEGIN
    NEW.credits := COALESCE(NEW.credits, 5);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set default credits on insert
DROP TRIGGER IF EXISTS set_default_credits_trigger ON organisations;
CREATE TRIGGER set_default_credits_trigger
    BEFORE INSERT ON organisations
    FOR EACH ROW
    EXECUTE FUNCTION set_default_credits(); 