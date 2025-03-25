# Website Content Management

This feature allows users to manage content for their websites, including pages, posts, and custom content types.

## Features

- View all website content in a tabular format
- Filter content by type (page, post, custom)
- Add new content with metadata
- Edit existing content
- View content details
- Delete content

## Implementation Details

### Database Schema

The `website_content` table has the following structure:

```sql
CREATE TABLE IF NOT EXISTS website_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('page', 'post', 'sitemap', 'other')),
  type TEXT NOT NULL CHECK (type IN ('page', 'post', 'custom')),
  status TEXT NOT NULL CHECK (status IN ('published', 'draft')),
  meta_description TEXT,
  meta_keywords TEXT,
  last_fetched TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(website_id, url)
);
```

### Components

1. **WebsiteContentContext**: Context provider for managing website content state and operations
2. **WebsiteContentManager**: UI component for displaying and managing website content
3. **WebsiteSitemap**: Page component that renders the WebsiteContentManager

### Usage

1. Navigate to the "Website Content" page from the sidebar
2. Select a website from the dropdown
3. View, add, edit, or delete content as needed

## Future Enhancements

- Content import from sitemap
- Content scraping from URLs
- SEO analysis and recommendations
- Content performance metrics
- Bulk operations (import/export)
- Content scheduling 