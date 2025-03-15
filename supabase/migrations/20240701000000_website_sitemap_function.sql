-- Function to fetch and parse a website's sitemap
CREATE OR REPLACE FUNCTION get_website_sitemap_pages(website_id UUID)
RETURNS TABLE (
  id UUID,
  website_id UUID,
  url TEXT,
  title TEXT,
  last_fetched TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  website_url TEXT;
  sitemap_url TEXT;
  sitemap_content TEXT;
  sitemap_found BOOLEAN := FALSE;
  common_sitemap_paths TEXT[] := ARRAY[
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
    '/wp-sitemap.xml',
    '/sitemap/sitemap-index.xml'
  ];
BEGIN
  -- Get the website URL
  SELECT url INTO website_url FROM websites WHERE id = website_id;
  
  IF website_url IS NULL THEN
    RAISE EXCEPTION 'Website with ID % not found', website_id;
  END IF;
  
  -- Remove trailing slash if present
  IF website_url LIKE '%/' THEN
    website_url := substring(website_url from 1 for length(website_url) - 1);
  END IF;
  
  -- Try common sitemap paths
  FOREACH sitemap_url IN ARRAY common_sitemap_paths LOOP
    BEGIN
      -- Attempt to fetch the sitemap
      SELECT content INTO sitemap_content 
      FROM http_get(website_url || sitemap_url);
      
      -- If we got here without an exception, we found a sitemap
      sitemap_found := TRUE;
      EXIT;
    EXCEPTION
      WHEN OTHERS THEN
        -- Continue to the next path
        CONTINUE;
    END;
  END LOOP;
  
  -- If no sitemap was found, return empty result
  IF NOT sitemap_found THEN
    RETURN;
  END IF;
  
  -- Parse the sitemap XML and extract URLs
  -- First, check if it's a sitemap index
  IF sitemap_content LIKE '%<sitemapindex%' THEN
    -- Process sitemap index (get first sitemap in the index)
    WITH sitemap_urls AS (
      SELECT 
        unnest(xpath('//sitemap/loc/text()', xmlparse(content sitemap_content))) AS sitemap_loc
    )
    SELECT content INTO sitemap_content 
    FROM http_get(sitemap_urls.sitemap_loc::text)
    FROM sitemap_urls
    LIMIT 1;
  END IF;
  
  -- Now process the actual sitemap
  RETURN QUERY
  WITH sitemap_urls AS (
    SELECT 
      unnest(xpath('//url/loc/text()', xmlparse(content sitemap_content))) AS url_loc,
      unnest(xpath('//url/lastmod/text()', xmlparse(content sitemap_content))) AS url_lastmod
  )
  SELECT 
    uuid_generate_v4() AS id,
    website_id,
    url_loc::text AS url,
    -- Extract title from URL (last path segment)
    COALESCE(
      nullif(regexp_replace(
        split_part(url_loc::text, '/', -1), 
        '\.html$|\.php$|\.asp$|\.aspx$', 
        ''
      ), ''),
      'Homepage'
    ) AS title,
    CURRENT_TIMESTAMP AS last_fetched
  FROM sitemap_urls;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION get_website_sitemap_pages(UUID) IS 'Fetches and parses a website sitemap to extract pages';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_website_sitemap_pages(UUID) TO authenticated; 