# Supabase Edge Function Formats

This document outlines the proper request formats for the Supabase edge functions used in the WP Content AI application.

## generate-post-ideas

Generates blog post ideas based on website content, keywords, and writing style.

### Request Format

```json
{
  "website_id": "550e8400-e29b-41d4-a716-446655440000",
  "keywords": ["content marketing", "SEO", "website optimization"],
  "writing_style": "conversational",
  "subject_matters": ["digital marketing", "web development"]
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `website_id` | string | Yes | Unique identifier for the website |
| `keywords` | string[] | No | Array of target keywords for content ideas |
| `writing_style` | string | No | Preferred tone/style (e.g., "conversational", "professional") |
| `subject_matters` | string[] | No | Array of subject areas to focus on |

### Notes

- The function fetches existing content and categories from the database
- It analyzes website tone and existing content before generating ideas
- Results include titles, descriptions, and suggested categories


## get-sitemap-pages

Finds and parses a website's sitemap to extract URLs for content analysis.

### Request Format

```json
{
  "website_id": "550e8400-e29b-41d4-a716-446655440000",
  "website_url": "https://example.com",
  "custom_sitemap_url": "https://example.com/sitemap_custom.xml"
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `website_id` | string | Yes | Unique identifier for the website |
| `website_url` | string | No | The website URL (if not retrieving from database) |
| `custom_sitemap_url` | string | No | Optional specific sitemap URL to use |

### Notes

- If `website_url` is not provided, it's retrieved from the database
- The function tries multiple common sitemap paths if a custom URL isn't specified
- Handles sitemap indexes and follows child sitemaps
- Returns page URLs with content types and modification dates


## scrape-content

Scrapes and analyzes content from specified URLs, creates digests using AI.

### Request Format

```json
{
  "website_id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://example.com/specific-page"
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `website_id` | string | Yes | Unique identifier for the website |
| `url` | string | No | Specific URL to scrape (optional) |

### Notes

- If no specific URL is provided, it processes all cornerstone pages for the website
- Extracts main content from HTML and removes unnecessary elements
- Uses OpenAI to generate concise digests (approximately 300 letters)
- Stores cleaned content and digests in the `website_content` table


## crawl-website-pages

Crawls a website to discover and extract pages when no sitemap is available.

### Request Format

```json
{
  "website_id": "550e8400-e29b-41d4-a716-446655440000",
  "max_pages": 30
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `website_id` | string | Yes | Unique identifier for the website |
| `max_pages` | number | No | Maximum number of pages to crawl (default: 50) |

### Notes

- Starts crawling from the homepage and follows internal links
- Filters out non-content pages (images, admin areas, etc.)
- Extracts page titles from HTML
- Limits crawling to the specified domain
- Useful as a fallback when sitemaps aren't available 