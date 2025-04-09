# LocalStorage to Database Mapping

## Post Themes
### Ungenerated Post Themes
```typescript
// From localStorage: 'post_ideas'
interface LocalStoragePostIdea {
  id: string;
  title: string;
  description: string;
  tags: string[];
  liked: boolean;  // User's preference for this idea
}

// Example localStorage data:
[
  {
    "id": "idea-1",
    "title": "How to Optimize Your Website",
    "description": "SEO tips and tricks",
    "tags": ["seo", "optimization"],
    "liked": true  // When true, this maps to status: "approved" in DB
  }
]

// To database: 'post_themes' (matches actual schema)
interface DbPostTheme {
  id: uuid;  // Required
  website_id: uuid;  // Required
  subject_matter: string;  // Required
  keywords: string[];  // Required, maps from localStorage.tags
  status: 'pending' | 'approved' | 'published' | 'textgenerated' | 'generated' | 'declined' | 'generatingidea';  // Required, 'approved' for liked ideas
  title: string;
  description: string | null;
  post_content: string | null;
  created_at: timestamp;  // Required
  updated_at: timestamp;  // Required
  scheduled_date: timestamp | null;
  wp_post_id: string | null;
  wp_post_url: string | null;
  wp_sent_date: date | null;
  image: string | null;
  wp_image_url: string | null;
}

// Example database record:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "website_id": "123e4567-e89b-12d3-a456-426614174000",
  "subject_matter": "SEO",
  "keywords": ["seo", "optimization"],  // Mapped from localStorage.tags
  "status": "approved",  // This post theme was liked by the user (localStorage.liked = true)
  "title": "How to Optimize Your Website",
  "description": "SEO tips and tricks",
  "post_content": null,
  "created_at": "2024-01-20T12:00:00Z",
  "updated_at": "2024-01-20T12:00:00Z",
  "scheduled_date": null,
  "wp_post_id": null,
  "wp_post_url": null,
  "wp_sent_date": null,
  "image": null,
  "wp_image_url": null
}
```

### Generated Post Themes
```typescript
// Example localStorage data:
{
  "generatedContentTitle": "5 Ways to Improve Customer Experience",
  "generatedContentPreview": "<h1>5 Ways to Improve Customer Experience</h1>..."
}

// Example database record (matches actual schema):
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "website_id": "123e4567-e89b-12d3-a456-426614174000",
  "subject_matter": "Customer Experience",
  "keywords": ["customer experience", "customer service"],
  "status": "textgenerated",  // Different status for AI-generated content
  "title": "5 Ways to Improve Customer Experience",
  "description": null,
  "post_content": "<h1>5 Ways to Improve Customer Experience</h1>...",
  "created_at": "2024-01-20T12:00:00Z",
  "updated_at": "2024-01-20T12:00:00Z",
  "scheduled_date": null,
  "wp_post_id": null,
  "wp_post_url": null,
  "wp_sent_date": null,
  "image": null,
  "wp_image_url": null
}
```

## Website Content
### Sitemap Pages and Key Content
```typescript
// From localStorage: 'website_content' and 'key_content_pages'
interface LocalStorageWebsitePage {
  id: string;
  url: string;
  title: string;
  content: string;
  content_type?: string;
  digest?: string;
  is_key_page?: boolean;  // True for pages from key_content_pages
}

// Example localStorage data for website_content:
[
  {
    "id": "page-1",
    "url": "https://example.com/about",
    "title": "About Us",
    "content": "<html>...",
    "content_type": "page",
    "digest": "Company information page..."
  }
]

// Example localStorage data for key_content_pages:
[
  {
    "id": "key-1",
    "url": "https://example.com",
    "title": "Homepage",
    "content": "<html>...",
    "digest": "Main landing page...",
    "is_key_page": true
  }
]

// To database: 'website_content' (matches actual schema)
interface DbWebsiteContent {
  id: uuid;  // Required
  website_id: uuid;  // Required
  url: string;  // Required
  title: string;
  content: string;  // Required
  content_type: string;  // Required
  is_cornerstone: boolean;  // True for first 4-5 key pages
  digest: string | null;
  metadata: jsonb | null;
  created_at: timestamp;  // Required
  updated_at: timestamp;  // Required
  last_fetched: timestamp;  // Required
  language: string;  // Required, from website_language in localStorage
}

// Example database record:
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "website_id": "123e4567-e89b-12d3-a456-426614174000",
  "url": "https://example.com",
  "title": "Homepage",
  "content": "<html>...",
  "content_type": "page",
  "is_cornerstone": true,  // This is one of the first 4-5 key pages
  "digest": "Main landing page...",
  "metadata": null,
  "created_at": "2024-01-20T12:00:00Z",
  "updated_at": "2024-01-20T12:00:00Z",
  "last_fetched": "2024-01-20T12:00:00Z",
  "language": "en"  // From website_language in localStorage
}
```

## Publication Settings
```typescript
// Example localStorage data:
{
  "posting_frequency": 7,
  "posting_days": [
    { "day": "monday", "count": 2 },
    { "day": "wednesday", "count": 3 },
    { "day": "friday", "count": 2 }
  ],
  "website_id": "123e4567-e89b-12d3-a456-426614174000",
  "writing_style": "Professional and informative",
  "subject_matters": ["technology", "business"]
}

// To database: 'publication_settings' (matches actual schema)
interface DbPublicationSettings {
  id: uuid;  // Required
  website_id: uuid;
  posting_frequency: smallint;  // Required
  posting_days: jsonb;  // Required
  writing_style: string;  // Required
  subject_matters: jsonb;  // Required
  wordpress_template: string | null;
  image_prompt: string | null;
  negative_prompt: string | null;
  image_model: string | null;
  created_at: timestamp;  // Required
  updated_at: timestamp;  // Required
}

// Example database record:
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "website_id": "123e4567-e89b-12d3-a456-426614174000",
  "posting_frequency": 7,
  "posting_days": [
    { "day": "monday", "count": 2 },
    { "day": "wednesday", "count": 3 },
    { "day": "friday", "count": 2 }
  ],
  "writing_style": "Professional and informative",
  "subject_matters": ["technology", "business"],
  "wordpress_template": null,
  "image_prompt": null,
  "negative_prompt": null,
  "image_model": null,
  "created_at": "2024-01-20T12:00:00Z",
  "updated_at": "2024-01-20T12:00:00Z"
}
```

## Transfer Process
1. Website Content:
   - Load pages from both 'website_content' and 'key_content_pages' in localStorage
   - First 4-5 pages from 'key_content_pages' are marked as cornerstone (is_cornerstone = true)
   - All other pages are marked as regular content (is_cornerstone = false)
   - For each page:
     - Generate UUID for id
     - Set website_id from the created website
     - Set content_type = 'page' if not specified
     - Set language from website_language in localStorage
     - Set timestamps (created_at, updated_at, last_fetched) to current time
   - Insert all pages into website_content table

2. Post Themes:
   - Filter liked ideas from 'post_ideas'
   - Set status to 'approved' (valid status from DB constraint)
   - Add generated content with status 'textgenerated' (valid status from DB constraint)
   - Ensure all required fields are present: id, website_id, subject_matter, keywords, status, created_at, updated_at
   - Generate UUIDs for new records

3. Publication Settings:
   - Ensure posting_days is stored as jsonb
   - Ensure subject_matters is stored as jsonb
   - Ensure all required fields are present: id, posting_frequency, writing_style, subject_matters, created_at, updated_at
   - Generate UUIDs for new records

Note: All transfers should happen after successful authentication and before redirecting to dashboard. The process preserves the hierarchical importance of key content pages by marking the first 4-5 as cornerstone content. 