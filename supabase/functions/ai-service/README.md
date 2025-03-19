# AI Service Edge Function

This Edge Function provides a secure backend for making requests to AI services like OpenAI. By using this Edge Function instead of directly calling OpenAI from the client, you can:

1. Keep your API keys secure on the server
2. Authenticate users before allowing AI service usage
3. Add rate limiting and usage tracking
4. Standardize error handling

## Features

- Secure OpenAI API access
- Authentication required
- Enhanced error handling
- Request/response logging

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

3. From the project root directory, deploy the function:
   ```bash
   supabase functions deploy ai-service
   ```

4. Set the required environment variables:
   ```bash
   supabase secrets set OPENAI_API_KEY=your_openai_api_key
   ```

## Configuration

You need to set the following environment variables:

- `OPENAI_API_KEY`: Your OpenAI API key

## Usage

Use this service from your frontend code via the provided `openaiService.ts` client:

```typescript
import { generateContent } from '@/services/openaiService';

// Example usage
const blogPost = await generateContent(
  'You are a professional content writer who specializes in WordPress articles.',
  'Write a blog post about optimizing WordPress performance.',
  'gpt-3.5-turbo',
  { temperature: 0.7, max_tokens: 1000 }
);
```

You can also call the Edge Function directly if needed:

```typescript
import { supabase } from '@/lib/supabase';

const response = await supabase.functions.invoke('ai-service', {
  body: {
    service: 'openai',
    payload: {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Write a short poem about WordPress.' }
      ],
      temperature: 0.7,
      max_tokens: 500
    }
  }
});
```

## Error Handling

The service returns standardized error responses:

```json
{
  "error": "Error message",
  "success": false
}
```

Successful responses include the full OpenAI response with an added `success: true` property. 