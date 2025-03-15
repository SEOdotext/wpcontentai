# WP Content AI

A content management and generation system for WordPress websites.

## Features

- Website management
- Content generation
- WordPress integration
- Content calendar
- Post themes management
- Sitemap parsing and content import

## Primary Content Feature

The application now supports designating a piece of content as "primary" for each website. This primary content is used as the base for generating content writing prompts.

### How it works:
1. In the Website Content Manager, each content item has a Primary Content column
2. Click the circle icon to set a content item as primary (indicated by a green checkmark)
3. Only one content item per website can be primary at a time
4. The database automatically ensures this constraint through a trigger

### Implementation Details:
- The `website_content` table has an `is_primary` boolean column (default: false)
- A database trigger ensures only one content item per website can be marked as primary
- The SQL script to add this feature is available in `add_is_primary_column.sql`

## Setup

### Database Setup

Before running the application, you need to set up the database tables. Run the following SQL in your Supabase SQL editor:

```sql
-- Create post_themes table
CREATE TABLE IF NOT EXISTS post_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  subject_matter TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'published')),
  scheduled_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE post_themes ENABLE ROW LEVEL SECURITY;

-- Policy for selecting post_themes (users can only see themes for websites they have access to)
CREATE POLICY select_post_themes ON post_themes
  FOR SELECT USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Policy for inserting post_themes
CREATE POLICY insert_post_themes ON post_themes
  FOR INSERT WITH CHECK (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Policy for updating post_themes
CREATE POLICY update_post_themes ON post_themes
  FOR UPDATE USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Policy for deleting post_themes
CREATE POLICY delete_post_themes ON post_themes
  FOR DELETE USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN user_profiles up ON up.organisation_id = w.organisation_id
      WHERE up.id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS post_themes_website_id_idx ON post_themes(website_id);
CREATE INDEX IF NOT EXISTS post_themes_subject_matter_idx ON post_themes(subject_matter);
CREATE INDEX IF NOT EXISTS post_themes_status_idx ON post_themes(status);
CREATE INDEX IF NOT EXISTS post_themes_scheduled_date_idx ON post_themes(scheduled_date);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_post_themes_updated_at
  BEFORE UPDATE ON post_themes
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
```

Additionally, you need to set up the sitemap function by running the following SQL:

```sql
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
```

### Running the Application

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open http://localhost:8080 in your browser

## Usage

### Content Creation

1. Go to http://localhost:8080/create
2. Enter keywords separated by commas
3. Click "Generate Suggestions" to create title suggestions
4. Like a suggestion to add it to your content calendar
5. Dislike a suggestion to remove it

### Website Content Import

1. Go to http://localhost:8080/sitemap
2. Select a website from the sidebar
3. Click "Import from Sitemap" to automatically fetch and import pages from the website's sitemap
4. The system will search for common sitemap paths (sitemap.xml, wp-sitemap.xml, etc.)
5. Pages found in the sitemap will be imported into the content database

If automatic sitemap detection fails:
1. A dialog will appear prompting you to enter a custom sitemap URL
2. Enter the direct URL to your website's sitemap (e.g., https://example.com/custom-sitemap.xml)
3. Click "Import" to fetch and import pages from the specified sitemap

If the website doesn't have a sitemap:
1. Click "Crawl Website Pages" to discover pages by crawling the website
2. Adjust the maximum number of pages to crawl (default: 50)
3. Click "Start Crawling" to begin the crawling process
4. The system will visit the website's homepage and follow links to discover pages
5. Discovered pages will be imported into the content database

### Settings

1. Go to http://localhost:8080/settings
2. Configure your publication frequency, writing style, and subject matters
3. Use the "Generate" button next to subject matters to create post themes

## Development

### Project Structure

- `src/components`: UI components
- `src/context`: Context providers for state management
- `src/pages`: Page components
- `src/integrations`: Integration with external services (Supabase, WordPress)
- `src/sql`: SQL scripts for database setup
