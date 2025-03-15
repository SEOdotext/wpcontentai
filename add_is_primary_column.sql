-- Add is_primary column to website_content table
ALTER TABLE website_content ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN website_content.is_primary IS 'Indicates if this content is the primary content for the website, used for generating content writing prompts';

-- Create function to ensure only one content item per website can be marked as primary
CREATE OR REPLACE FUNCTION ensure_single_primary_content()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new row is being set as primary
    IF NEW.is_primary = true THEN
        -- Set all other content for this website to not primary
        UPDATE website_content
        SET is_primary = false
        WHERE website_id = NEW.website_id
        AND id != NEW.id
        AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute the function before insert or update
DROP TRIGGER IF EXISTS website_content_primary_trigger ON website_content;
CREATE TRIGGER website_content_primary_trigger
BEFORE INSERT OR UPDATE ON website_content
FOR EACH ROW
EXECUTE FUNCTION ensure_single_primary_content();

-- Create an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_website_content_is_primary ON website_content(website_id, is_primary); 