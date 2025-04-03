# ContentGardener.ai Content Generation and Publishing Flow

## Overview
This document explains the flow of content generation and publishing in ContentGardener.ai, from frontend request to WordPress publication.

## ⚠️ Critical System Requirements

### Database Requirements
- NEVER remove or modify the structure of these tables without migration:
  - `post_themes`
  - `publish_queue`
  - `image_generation_queue`
  - `wordpress_settings`
  - `post_theme_categories`
- NEVER change the UUID format for IDs
- NEVER modify the status enums without updating all functions

### Function Dependencies
- NEVER change function names without updating all references
- NEVER modify the response format of functions without updating all consumers
- NEVER remove error logging - it's critical for debugging
- NEVER bypass the queue system - it ensures orderly processing

### Authentication
- NEVER expose API keys in frontend code
- NEVER bypass RLS policies
- NEVER store WordPress credentials in plaintext
- NEVER remove token validation in Edge Functions

## Detailed Flow with Comments

### 1. Frontend Initiation
```typescript
// IMPORTANT: Always use these status types
type PostStatus = 'pending' | 'approved' | 'published' | 'textgenerated' | 
                 'generated' | 'declined' | 'generatingidea';

// NEVER bypass this flow - it ensures proper state management
async function handleGenerateAndPublish(postThemeId: string) {
  // 1. Check website settings
  // 2. Call generate-and-publish function
  // 3. Poll for updates
}
```

### 2. Queue System
```typescript
// Queue Schema - NEVER modify without migration
interface PublishQueue {
  id: string;
  post_theme_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  result: JsonB;
  error: string | null;
  user_token: string;
}

// CRITICAL: Always maintain this order of operations
1. Create queue entry
2. Start processing
3. Update status
4. Handle errors
```

### 3. Content Generation
```typescript
// IMPORTANT: Content generation must happen before image generation
// NEVER generate image without content - it needs context

// Content Generation Flow:
1. Check if content exists
2. Generate if needed
3. Wait for completion
4. Validate content
5. Proceed to image generation

// NEVER modify these without updating all dependent functions
interface PostTheme {
  id: string;
  website_id: string;
  subject_matter: string;
  keywords: string[];
  status: PostStatus;
  post_content: string | null;
  // ... other fields
}
```

### 4. Image Generation
```typescript
// Image Generation Flow - NEVER change this order
1. Check website settings
2. Add to image queue
3. Trigger queue processor
4. Poll for completion

// CRITICAL: Image timeouts
const IMAGE_GENERATION_TIMEOUT = 120000; // 120 seconds
const POLLING_INTERVAL = 2000; // 2 seconds

// NEVER modify these without updating the frontend
interface ImageGenerationQueue {
  id: string;
  post_theme_id: string;
  website_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  image_url: string | null;
}
```

### 5. WordPress Publishing
```typescript
// CRITICAL: WordPress publishing requirements
1. Valid WordPress credentials
2. Generated content
3. Optional but recommended: Generated image
4. Valid post status

// NEVER publish without these checks
async function validatePublishing(postTheme: PostTheme) {
  if (!postTheme.post_content) throw new Error('No content');
  if (!wpSettings.is_connected) throw new Error('WordPress not connected');
  // ... other validations
}
```

## Database Schema Notes

### post_themes
```sql
-- NEVER remove these columns - they're essential for the flow
CREATE TABLE post_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id),
  subject_matter TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  post_content TEXT,
  image TEXT,
  wp_post_id TEXT,
  wp_post_url TEXT,
  wp_sent_date TIMESTAMPTZ
);

-- CRITICAL: These policies must remain
ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own post themes"...
```

### publish_queue
```sql
-- NEVER modify queue structure without updating processors
CREATE TABLE publish_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_theme_id UUID NOT NULL REFERENCES post_themes(id),
  status TEXT NOT NULL DEFAULT 'pending',
  -- ... other fields
);

-- CRITICAL: Indexes for performance
CREATE INDEX idx_publish_queue_status ON publish_queue(status);
CREATE INDEX idx_publish_queue_post_theme_id ON publish_queue(post_theme_id);
```

## Common Pitfalls to Avoid

### Frontend
- DON'T poll too frequently (stick to 5-second intervals)
- DON'T assume immediate completion
- DON'T cache post theme status aggressively
- DON'T ignore error states
- DON'T bypass the queue system

### Backend
- DON'T modify function response formats
- DON'T remove error logging
- DON'T change status enums
- DON'T bypass RLS policies
- DON'T modify table structures without migration

### WordPress Integration
- DON'T store credentials in code
- DON'T bypass SSL verification
- DON'T ignore WordPress API errors
- DON'T modify post data structure
- DON'T remove status checks

## Performance Considerations

### Database
- Keep indexes on frequently queried fields
- Regular cleanup of old queue entries
- Monitor table sizes
- Use appropriate column types

### Functions
- Respect timeouts
- Handle concurrent requests
- Implement proper error handling
- Use appropriate caching
- Monitor memory usage

### Frontend
- Implement exponential backoff for polling
- Handle offline scenarios
- Cache appropriate data
- Show meaningful progress indicators
- Handle all error states

## Monitoring and Debugging

### Key Metrics to Watch
- Queue processing times
- Error rates
- Timeout frequencies
- API response times
- Database performance

### Common Issues and Solutions
1. Image Generation Timeouts
   - Check DALL-E API status
   - Verify prompt length
   - Monitor queue processor

2. WordPress Publishing Failures
   - Verify credentials
   - Check API access
   - Validate content format

3. Queue Processing Issues
   - Monitor stalled jobs
   - Check for concurrent processing
   - Verify token validity

4. Database Performance
   - Monitor index usage
   - Check query performance
   - Watch table sizes 