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
  is_cornerstone: boolean;  // True for  key pages
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
  "is_cornerstone": true,  // For all key pages
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
  format_template: string | null;
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
  "format_template": null,
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
   - The pages from 'key_content_pages' are marked as cornerstone (is_cornerstone = true)
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

Note: All transfers should happen after successful authentication and before redirecting to dashboard. The process preserves the hierarchical importance of key content pages by marking the the key as cornerstone content. 




Localstorage content for the sitemap looks like? 

[{id: "ef3e6d56-f60d-4458-9cb4-90be2f3e93b1", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…},…]
0
: 
{id: "ef3e6d56-f60d-4458-9cb4-90be2f3e93b1", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
content_type
: 
"post"
id
: 
"ef3e6d56-f60d-4458-9cb4-90be2f3e93b1"
last_fetched
: 
"2025-04-10T07:45:01.476Z"
title
: 
"Festudlejning Bedrefest Dk"
url
: 
"https://openocean.dk/festudlejning-bedrefest-dk/"
website_id
: 
"dda1e214-4f89-4cbe-aeb4-df02938a5e43"
1
: 
{id: "ebc551a8-38c9-4045-a47f-6ac7bbd050e8", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
2
: 
{id: "19aca288-8096-4c61-9388-d3cf43d2010e", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
3
: 
{id: "194a3d87-fc82-4595-8588-c3b497254927", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
4
: 
{id: "40f5c80b-63b1-44a0-8e79-9415e1549421", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
5
: 
{id: "45478acc-9f90-4822-b58b-0ad651fcfdf0", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
6
: 
{id: "29b85638-a9b7-48da-ba01-02c852590417", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
7
: 
{id: "78ab1dd0-ba25-437b-90f6-48f40204cc83", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
8
: 
{id: "1429b36d-1c13-4df7-80bb-85b38e163a88", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
9
: 
{id: "5c92470a-e0d8-4392-9fcf-c2be41340caa", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
10
: 
{id: "7a25ddd8-56ca-406f-9b2d-2155655bb6eb", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
11
: 
{id: "367137b4-0910-4d28-b6d6-b4e2df3c65bd", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
12
: 
{id: "7cec9ced-2273-4959-81ab-f51d0f950f2a", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
13
: 
{id: "319d1ccf-93be-46d8-96d5-336b19d720f5", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
14
: 
{id: "c44ebe5d-e1f2-4c36-9d3a-5632e6d9f846", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
15
: 
{id: "07137aaf-5a33-4718-ae9e-cdd7145ee3d8", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
16
: 
{id: "8acc2af2-478a-40e2-8001-a789648b6207", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
17
: 
{id: "c4cbd618-db5e-4f1e-8d8b-720a06cfb880", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
18
: 
{id: "56308ac4-682e-413e-b6fb-0f2b671d4587", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
19
: 
{id: "5087dfbd-8d00-4af5-aef5-bae3432ce9a0", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
20
: 
{id: "050058c5-65fc-4314-9eb0-3b5df2473540", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
21
: 
{id: "0972190c-7716-4c12-8606-9f84bd756165", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
22
: 
{id: "d05bd138-cf88-4000-9b85-fa0e8b7ee7f4", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
23
: 
{id: "8642a9b3-b467-40a1-873e-8612d18ab945", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
24
: 
{id: "5021eb42-2705-461c-a9fa-e5c885974a72", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
25
: 
{id: "c4e521a5-6ab2-4bde-aceb-97a1b1883969", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
26
: 
{id: "4b755f55-cec0-435b-a59e-dbd02062a5e3", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
27
: 
{id: "47b6771f-c454-4cc4-8491-574d46b51b6d", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
28
: 
{id: "b804bb9f-61e1-48a6-bae2-46a8ee6f63eb", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
29
: 
{id: "385b5c13-701f-4521-b4f7-a7bea0dfe389", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
30
: 
{id: "9281f650-de81-43b8-b553-4cb106ee70c2", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
31
: 
{id: "4f50b499-ea38-415d-b248-18d63585e836", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
32
: 
{id: "989a88ca-4ac3-4c63-b894-c355b1d648c1", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
33
: 
{id: "0d0ff7c5-bc67-49d8-bafe-72fc1c62e564", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
34
: 
{id: "0132789b-fb6a-4776-80af-0bc1e5ed94dd", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
35
: 
{id: "fd10f649-b163-4c1f-bad3-d374bd054666", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
36
: 
{id: "cd99db38-78fc-46fd-bb5f-d69afed286c3", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
37
: 
{id: "2ff2a6ab-fb08-44aa-be8a-12478157df67", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
38
: 
{id: "8b7bb954-7d97-4194-b05d-f49263582c97", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
39
: 
{id: "93325e0f-3308-4273-879b-72121aa29bb4", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
40
: 
{id: "f56a3b59-3395-41f7-a933-71a2341f95ce", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
41
: 
{id: "35b45b0e-ae3c-4cc5-860e-6fc4252ddf07", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
42
: 
{id: "ef60f79a-206a-4943-bd52-5ba49424cd17", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
43
: 
{id: "92e0e1ed-7dd7-4de2-9c3e-561bce5b0881", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
44
: 
{id: "162689c9-d6f7-4ef3-806d-e0db644124a1", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
45
: 
{id: "126b39e5-d49b-49f4-a053-b786c9f34890", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
46
: 
{id: "7e1da71a-81cc-4671-8523-78f5d5991b04", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
47
: 
{id: "7d244f49-6950-4086-ba4e-0e9c46eb6318", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
48
: 
{id: "b7e1c226-dd76-4297-a607-f15a9a7321da", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
49
: 
{id: "ce535778-6bd4-4a0d-84de-e240e95b25fa", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
50
: 
{id: "ac0932e4-d999-43c1-b701-1f85108697c1", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
51
: 
{id: "3df67b00-438a-4439-89ab-ad79b174da04", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
52
: 
{id: "d17219ec-d6cc-4196-b887-98ff3efdff7d", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
53
: 
{id: "320a6261-b1d5-456c-a338-1cdacf82784c", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
54
: 
{id: "4cf9714b-a0c6-4052-a10c-73022a98ce46", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
55
: 
{id: "9fe171cd-21ce-4992-a0c5-d2d1011707ca", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
56
: 
{id: "527a0c7c-11f6-41a4-bb11-fd5056e6dfc5", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
57
: 
{id: "6bb507b7-a9ad-4d80-9d08-735bf3988833", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}
58
: 
{id: "76b0e0e1-d012-469d-aa62-7a264a245686", website_id: "dda1e214-4f89-4cbe-aeb4-df02938a5e43",…}