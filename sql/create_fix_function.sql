-- Create a function to fix the cornerstone content issue
CREATE OR REPLACE FUNCTION fix_cornerstone_content()
RETURNS TEXT AS $$
DECLARE
    trigger_count INTEGER;
    trigger_names TEXT[];
    trigger_name TEXT;
    result TEXT := 'Cornerstone content fix completed:';
    r RECORD;
BEGIN
    -- Check for triggers on the website_content table
    SELECT COUNT(*), ARRAY_AGG(trigger_name)
    INTO trigger_count, trigger_names
    FROM information_schema.triggers
    WHERE event_object_table = 'website_content'
    AND action_statement LIKE '%is_primary%';
    
    -- Drop any triggers that might be enforcing a single primary content
    IF trigger_count > 0 THEN
        result := result || ' Found ' || trigger_count || ' triggers that might be enforcing single primary content.';
        
        FOREACH trigger_name IN ARRAY trigger_names LOOP
            EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON website_content';
            result := result || ' Dropped trigger: ' || trigger_name || '.';
        END LOOP;
    ELSE
        result := result || ' No triggers found enforcing single primary content.';
    END IF;
    
    -- Ensure the is_primary column exists and is properly set up
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'website_content' AND column_name = 'is_primary'
    ) THEN
        -- Add the is_primary column if it doesn't exist
        ALTER TABLE website_content ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;
        result := result || ' Added is_primary column to website_content table.';
    ELSE
        result := result || ' is_primary column already exists.';
    END IF;
    
    -- Update any NULL values to FALSE for consistency
    UPDATE website_content SET is_primary = FALSE WHERE is_primary IS NULL;
    result := result || ' Updated NULL is_primary values to FALSE.';
    
    -- Create an index on is_primary for better performance
    CREATE INDEX IF NOT EXISTS idx_website_content_is_primary ON website_content(is_primary);
    result := result || ' Created or confirmed index on is_primary.';
    
    -- Count cornerstone content by website
    result := result || ' Current cornerstone content counts by website:';
    FOR r IN 
        SELECT website_id, COUNT(*) as cornerstone_count
        FROM website_content
        WHERE is_primary = TRUE
        GROUP BY website_id
        ORDER BY website_id
    LOOP
        result := result || ' Website ' || r.website_id || ': ' || r.cornerstone_count || ' cornerstone items.';
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql; 