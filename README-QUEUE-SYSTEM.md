# WordPress Content AI Queue System

This document explains how the WordPress Content AI queue system works, particularly for automated publishing of scheduled posts.

## Core Components

### 1. Process Publish Queue Function

The `process-publish-queue` function is the heart of the system. It does two key things:

- **Finds scheduled posts** - Checks for any posts with `scheduled_date <= today` and adds them to the queue
- **Processes the queue** - Takes the oldest pending job and processes it

### 2. Generate and Publish Function

The `generate-and-publish` function performs the actual work:

- Generates content (text) if needed based on post status
- Generates images if needed based on post status
- Publishes to WordPress

## Post Status Flow

The system uses the `status` field in the `post_themes` table to track progress:

1. **approved** - Initial status, needs content + image + publishing
2. **textgenerated** - Content has been generated, needs image + publishing
3. **generated** - Content and image are ready, needs publishing
4. **published** - Successfully published to WordPress

## Setting Up Automation

To set up automated processing of scheduled posts, you need to create a scheduled function that calls the `process-publish-queue` endpoint. 

### Supabase Dashboard Method

1. Go to the Supabase Dashboard
2. Navigate to Database → Scheduled Functions
3. Create a new scheduled function:
   - Name: `check_scheduled_posts`
   - Schedule: `0 * * * *` (runs every hour)
   - Function: 
   ```sql
   BEGIN
     PERFORM http_post(
       'https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/process-publish-queue',
       '{}',
       'application/json',
       ARRAY[http_header('Authorization', 'Bearer ' || current_setting('supabase_functions.service_role_key'))],
       60
     );
     RETURN 'OK';
   END;
   ```

### External CRON Method (Alternative)

You can also use an external CRON service like GitHub Actions, Vercel Cron, or AWS Lambda to call the endpoint periodically.

Example curl command:
```bash
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" -H "X-System-Auth: true" https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/process-publish-queue
```

## Debugging

If you need to debug issues with the queue system:

1. Check the `publish_queue` table to see the status of jobs
2. Look at the `result` JSON field in the `publish_queue` table for detailed error information
3. Examine the function logs in the Supabase Dashboard

## Manual Testing

To manually test the system:

1. Create a post with scheduled_date set to today or earlier
2. Call the process-publish-queue function:
   ```bash
   curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" -H "X-System-Auth: true" https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/process-publish-queue
   ```
3. Check the `publish_queue` table for results 