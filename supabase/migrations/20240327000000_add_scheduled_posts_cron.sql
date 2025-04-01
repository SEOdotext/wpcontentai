-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to check for scheduled posts daily at 00:00 UTC
SELECT cron.schedule(
  'check-scheduled-posts-daily',
  '0 0 * * *', -- Run at 00:00 UTC every day
  $$
  SELECT net.http_post(
    url := 'https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/check-scheduled-posts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Scheduled-Task', 'true',
      'Authorization', 'Bearer p%3A%2F%2Flocalhost%3A8080%fmriooenogn'
    )
  ) AS request_id;
  $$
); 