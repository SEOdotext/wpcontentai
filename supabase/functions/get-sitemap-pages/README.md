# Sitemap Pages Edge Function

This Supabase Edge Function fetches and parses website sitemaps to extract page URLs.

## Features

- Searches for sitemaps at common paths (sitemap.xml, wp-sitemap.xml, etc.)
- Handles sitemap indexes by fetching the first child sitemap
- Extracts page URLs and titles
- Handles errors gracefully with timeouts and retries

## Deployment

To deploy this Edge Function to your Supabase project:

1. Make sure you have the Supabase CLI installed:
   ```bash
   npm install -g supabase
   ```

2. Login to your Supabase account:
   ```bash
   supabase login
   ```

3. Link your local project to your Supabase project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy get-sitemap-pages
   ```

## Usage

You can call this function from your frontend code using the Supabase client:

```typescript
const { data, error } = await supabase.functions.invoke('get-sitemap-pages', {
  body: { website_id: 'your-website-id' }
});

if (error) {
  console.error('Error:', error);
  return;
}

console.log(`Found ${data.pages.length} pages in sitemap at ${data.sitemap_url}`);
```

## Response Format

The function returns a JSON object with the following structure:

```json
{
  "sitemap_url": "https://example.com/sitemap.xml",
  "pages": [
    {
      "id": "uuid-v4",
      "website_id": "your-website-id",
      "url": "https://example.com/page1",
      "title": "Page1",
      "last_fetched": "2023-07-01T12:00:00.000Z"
    },
    ...
  ]
}
```

## Error Handling

If an error occurs, the function will return a JSON object with an `error` property:

```json
{
  "error": "Error message",
  "pages": []
}
``` 