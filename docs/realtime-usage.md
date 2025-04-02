# Realtime Publish Queue Monitoring

This documentation explains how to use the realtime publish queue monitoring features in your application.

## Overview

The system now includes realtime subscriptions to track the progress of content generation and WordPress publishing. This allows your frontend to display real-time updates about the status of operations, including:

- Publish queue status and progress
- Image generation status
- Post theme updates

## RLS Policies

For realtime subscriptions to work properly, Row Level Security (RLS) policies have been set up for the following tables:

- `publish_queue`
- `image_generation_queue`
- `post_themes`

These policies ensure that users can only access data related to post themes in their organization.

## Components

### PublishQueueMonitor

The `PublishQueueMonitor` component provides a ready-to-use UI for tracking the progress of a post theme's publishing process:

```tsx
import PublishQueueMonitor from '../components/PublishQueueMonitor';

// In your component:
const MyComponent = () => {
  const postThemeId = '7bad08e9-30b0-42b7-85fe-4179be3e0deb';
  
  const handleProgressUpdate = (progress, status, data) => {
    console.log(`Progress: ${progress}%, Status: ${status}`);
    // You can update your UI based on this information
  };
  
  return (
    <div>
      <h2>My Content</h2>
      <PublishQueueMonitor 
        postThemeId={postThemeId}
        onProgressUpdate={handleProgressUpdate}
      />
    </div>
  );
};
```

### Direct API Usage

If you prefer to handle the subscriptions yourself, you can use the API functions directly:

```tsx
import { useEffect } from 'react';
import { 
  subscribeToPublishQueue, 
  subscribeToImageQueue,
  subscribeToPostTheme,
  subscribeToAllUpdates
} from '../api/aiEndpoints';

// In your component:
useEffect(() => {
  const postThemeId = '7bad08e9-30b0-42b7-85fe-4179be3e0deb';
  
  // Option 1: Subscribe to all updates at once
  const unsubscribe = subscribeToAllUpdates(postThemeId, {
    onPublishQueueUpdate: (data) => {
      console.log('Publish queue update:', data);
    },
    onImageQueueUpdate: (data) => {
      console.log('Image queue update:', data);
    },
    onPostThemeUpdate: (data) => {
      console.log('Post theme update:', data);
    }
  });
  
  // Option 2: Subscribe to individual updates
  const unsubscribePublish = subscribeToPublishQueue(postThemeId, (data) => {
    console.log('Publish queue update:', data);
  });
  
  const unsubscribeImage = subscribeToImageQueue(postThemeId, (data) => {
    console.log('Image queue update:', data);
  });
  
  const unsubscribePostTheme = subscribeToPostTheme(postThemeId, (data) => {
    console.log('Post theme update:', data);
  });
  
  // Cleanup
  return () => {
    // Option 1: Cleanup
    unsubscribe();
    
    // Option 2: Cleanup
    unsubscribePublish();
    unsubscribeImage();
    unsubscribePostTheme();
  };
}, []);
```

## Publish Queue Status Format

The `publish_queue` table contains detailed status information in the `result` JSONB field. Here's what you can expect:

```json
{
  "log": [
    "Job created at 2025-04-02T15:49:44.491+00:00",
    "Started processing at 2025-04-02T15:49:45.123+00:00",
    "Retrieved post theme data at 2025-04-02T15:49:45.456+00:00",
    "Retrieved website and WordPress settings at 2025-04-02T15:49:46.789+00:00",
    "Starting content generation at 2025-04-02T15:49:47.123+00:00"
  ],
  "progress": 30,
  "postThemeId": "7bad08e9-30b0-42b7-85fe-4179be3e0deb",
  "postThemeStatus": "approved",
  "step": "content_generation"
}
```

## Troubleshooting

### Realtime Updates Not Working

If you're not receiving realtime updates:

1. **Check RLS Policies**: Make sure the user has access to the organization that owns the post theme.
2. **Check Console Logs**: Look for subscription-related logs in the browser console.
3. **Verify Data Access**: Try running a direct query to check if the user can access the data:

```tsx
const { data, error } = await supabase
  .from('publish_queue')
  .select('*')
  .eq('post_theme_id', postThemeId);

console.log('Can access data:', data, error);
```

### "Can't Access Channel" Error

If you see a "can't access channel" error, it means your RLS policies are preventing access to the data. Check that:

1. The user is authenticated
2. The user is a member of the organization that owns the post theme
3. The post theme ID is valid and belongs to the user's organization 