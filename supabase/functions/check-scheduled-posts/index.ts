import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Get allowed origins from environment variables
const ALLOWED_ORIGINS = {
  production: Deno.env.get('ALLOWED_ORIGINS_PROD')?.split(',') || ['https://contentgardener.ai', 'https://contentgardener.ai/'],
  staging: Deno.env.get('ALLOWED_ORIGINS_STAGING')?.split(',') || ['https://staging.contentgardener.ai', 'http://localhost:8080']
};

// Special token for cron job authentication
const SCHEDULED_TASK_TOKEN = Deno.env.get('SCHEDULED_TASK_TOKEN') || 'missing-token';

// Function to determine if origin is allowed
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // In development, allow all origins
  if (Deno.env.get('ENVIRONMENT') === 'development') return true;
  
  // Check against allowed origins based on environment
  const allowedOrigins = Deno.env.get('ENVIRONMENT') === 'production' 
    ? ALLOWED_ORIGINS.production 
    : ALLOWED_ORIGINS.staging;
    
  return allowedOrigins.includes(origin);
}

serve(async (req) => {
  // Get the origin from the request
  const origin = req.headers.get('origin');
  
  // Set CORS headers based on origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin || ALLOWED_ORIGINS.production[0] : ALLOWED_ORIGINS.production[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for cron job auth token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const isCronJob = req.headers.get('X-Scheduled-Task') === 'true';
    
    // If this is a scheduled task, validate the token
    if (isCronJob) {
      console.log('Received scheduled task request');
      
      if (token !== SCHEDULED_TASK_TOKEN) {
        console.error('Invalid scheduled task token');
        return new Response(
          JSON.stringify({
            error: 'Unauthorized'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401
          }
        );
      }
      console.log('Scheduled task token validated');
    } else {
      // For non-cron requests, require service role or admin authentication
      if (!authHeader) {
        console.error('Missing Authorization header');
        return new Response(
          JSON.stringify({
            error: 'Missing Authorization header'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401
          }
        );
      }
    }

    // Create Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current date in UTC
    const now = new Date();
    const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    // Find posts that are ready to be published
    const { data: readyPosts, error: postsError } = await supabaseClient
      .from('post_themes')
      .select(`
        id,
        website_id,
        status,
        scheduled_date,
        wp_sent_date
      `)
      .in('status', ['approved', 'generated'])
      .is('wp_sent_date', null)
      .lte('scheduled_date', today.toISOString());

    if (postsError) {
      console.error('Error fetching ready posts:', postsError);
      throw new Error(`Failed to fetch ready posts: ${postsError.message}`);
    }

    if (!readyPosts || readyPosts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No posts ready to be published',
          processedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${readyPosts.length} posts ready to be published`);

    // Add each post to the publish queue
    const processedPosts = [];
    for (const post of readyPosts) {
      try {
        // Check if post is already in the queue
        const { data: existingQueueItem } = await supabaseClient
          .from('publish_queue')
          .select('id')
          .eq('post_theme_id', post.id)
          .eq('status', 'pending')
          .single();

        if (existingQueueItem) {
          console.log(`Post ${post.id} is already in the queue, skipping...`);
          continue;
        }

        // Add to publish queue
        const { data: queueJob, error: queueError } = await supabaseClient
          .from('publish_queue')
          .insert({
            post_theme_id: post.id,
            status: 'pending',
            created_at: new Date().toISOString(),
            user_token: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          })
          .select()
          .single();

        if (queueError) {
          console.error(`Error adding post ${post.id} to queue:`, queueError);
          continue;
        }

        processedPosts.push({
          postId: post.id,
          queueJobId: queueJob.id,
          status: 'queued'
        });

        console.log(`Added post ${post.id} to publish queue`);
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
        processedPosts.push({
          postId: post.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed'
        });
      }
    }

    // Trigger queue processing
    const queueResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/process-publish-queue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (!queueResponse.ok) {
      console.error('Error triggering queue processing:', await queueResponse.text());
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Processed scheduled posts',
        processedCount: processedPosts.length,
        processedPosts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-scheduled-posts function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
}); 