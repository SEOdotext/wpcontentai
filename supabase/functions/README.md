# Supabase Edge Functions for WordPress Integration

This directory contains the Edge Functions used to securely integrate WordPress with the application. By using these serverless functions, we avoid CORS issues and keep sensitive credentials more secure.

## Functions

### wordpress-connect

**Purpose**: Handles connecting to WordPress, testing connections, and storing WordPress credentials securely.

**Endpoints**:
- `POST /functions/wordpress-connect` - Connect to WordPress and save credentials
  - Parameters: `url`, `username`, `password`, `website_id`, `action` (optional)
  - Actions: `connect` (default), `test`

### wordpress-posts

**Purpose**: Manages WordPress post operations securely.

**Endpoints**:
- `POST /functions/wordpress-posts` - Create or update WordPress posts
  - Parameters: `website_id`, `title`, `content`, `status`, `action`, `post_id` (for updates)
  - Actions: `create`, `update`

## Deployment

```bash
# Deploy all functions
npm run supabase:functions:deploy

# Serve functions locally for development
npm run supabase:functions:serve
```

## Testing Locally

First start your Supabase services:

```bash
npm run supabase:start
```

Then serve the functions:

```bash
npm run supabase:functions:serve
```

You can then test the functions with curl:

```bash
# Test WordPress connection
curl -i --location --request POST 'http://localhost:54321/functions/v1/wordpress-connect' \
  --header 'Authorization: Bearer <JWT>' \
  --header 'Content-Type: application/json' \
  --data '{"url":"example.com","username":"admin","password":"xxxx xxxx xxxx xxxx","website_id":"abc-123","action":"test"}'

# Create a WordPress post
curl -i --location --request POST 'http://localhost:54321/functions/v1/wordpress-posts' \
  --header 'Authorization: Bearer <JWT>' \
  --header 'Content-Type: application/json' \
  --data '{"website_id":"abc-123","title":"Test Post","content":"This is test content","status":"draft","action":"create"}'
``` 