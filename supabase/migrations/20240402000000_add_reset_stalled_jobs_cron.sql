-- Enable required extensions (in case they're not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to check for stalled jobs hourly
SELECT cron.schedule(
  'reset-stalled-jobs-hourly',
  '0 * * * *', -- Run at the top of every hour
  $$
  -- This will run with database permissions, which should be sufficient
  -- as the Edge Function is set to verify_jwt=false in config.toml
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/reset-stalled-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.scheduled_task_token')
    )
  ) AS request_id;
  $$
); 