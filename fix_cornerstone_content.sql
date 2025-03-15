-- SQL script to fix cornerstone content issues

-- 1. Check if the is_primary column exists and is properly defined
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'website_content' AND column_name = 'is_primary';

-- 2. If the column doesn't exist or has issues, ensure it's properly defined
-- (This should be commented out if the column already exists correctly)
-- ALTER TABLE website_content ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- 3. Update any NULL values to FALSE to ensure consistency
UPDATE website_content 
SET is_primary = FALSE 
WHERE is_primary IS NULL;

-- 4. Create an index on is_primary for better performance
CREATE INDEX IF NOT EXISTS idx_website_content_is_primary 
ON website_content(is_primary);

-- 5. Create an index on the combination of website_id and is_primary
CREATE INDEX IF NOT EXISTS idx_website_content_website_id_is_primary 
ON website_content(website_id, is_primary);

-- 6. Check if any records have is_primary set to TRUE
SELECT COUNT(*) as primary_count 
FROM website_content 
WHERE is_primary = TRUE;

-- 7. List all cornerstone content for reference
SELECT id, website_id, title, url, is_primary 
FROM website_content 
WHERE is_primary = TRUE 
ORDER BY website_id, title;

-- SQL function to fix cornerstone content issues

CREATE OR REPLACE FUNCTION fix_cornerstone_content()
RETURNS void AS $$
BEGIN
  -- Update any NULL values to FALSE to ensure consistency
  UPDATE website_content 
  SET is_primary = FALSE 
  WHERE is_primary IS NULL;
  
  -- Log the fix
  RAISE NOTICE 'Fixed NULL is_primary values in website_content table';
END;
$$ LANGUAGE plpgsql; 