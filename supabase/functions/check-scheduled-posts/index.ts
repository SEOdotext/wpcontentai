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

    // First check WordPress connection status
    const { data: wpSettings, error: wpError } = await supabaseClient
      .from('wordpress_settings')
      .select('is_connected, website_id')
      .eq('is_connected', true);

    if (wpError) {
      console.error('Error fetching WordPress settings:', wpError);
      throw new Error(`Failed to fetch WordPress settings: ${wpError.message}`);
    }

    // Check for and handle stalled queue items first
    const STALL_TIMEOUT_MINUTES = 30; // Consider items stalled after 30 minutes
    const stallCutoff = new Date(Date.now() - (STALL_TIMEOUT_MINUTES * 60 * 1000)).toISOString();
    
    const { data: stalledItems } = await supabaseClient
      .from('publish_queue')
      .select('id, post_theme_id, status, started_at')
      .in('status', ['pending', 'processing'])
      .lt('created_at', stallCutoff);

    if (stalledItems && stalledItems.length > 0) {
      console.log(`Found ${stalledItems.length} stalled queue items:`, {
        items: stalledItems.map(item => ({
          id: item.id,
          postThemeId: item.post_theme_id,
          status: item.status,
          startedAt: item.started_at
        }))
      });

      // Mark stalled items as failed
      const { error: updateError } = await supabaseClient
        .from('publish_queue')
        .update({
          status: 'failed',
          error: 'Queue item timed out',
          completed_at: new Date().toISOString()
        })
        .in('id', stalledItems.map(item => item.id));

      if (updateError) {
        console.error('Error updating stalled items:', updateError);
      }
    }

    // Get list of connected website IDs
    const connectedWebsiteIds = wpSettings?.map(s => s.website_id) || [];

    // Find posts that are ready to be published, excluding those with active queue items
    const { data: readyPosts, error: postsError } = await supabaseClient
      .from('post_themes')
      .select(`
        id,
        website_id,
        status,
        scheduled_date,
        wp_sent_date,
        wp_post_url,
        (
          select count(*)
          from publish_queue
          where post_theme_id = post_themes.id
          and status in ('pending', 'processing')
        ) as active_queue_count
      `)
      .in('status', ['approved', 'generated'])
      .is('wp_sent_date', null)
      .is('wp_post_url', null)
      .lte('scheduled_date', today.toISOString())
      .in('website_id', connectedWebsiteIds)
      .eq('active_queue_count', 0); // Only get posts with no active queue items

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
    console.log(`Processing ${readyPosts.length} posts for publishing:`, {
      postIds: readyPosts.map(p => p.id),
      websiteIds: readyPosts.map(p => p.website_id),
      scheduledDates: readyPosts.map(p => p.scheduled_date)
    });

    for (const post of readyPosts) {
      try {
        console.log(`Processing post ${post.id}:`, {
          websiteId: post.website_id,
          scheduledDate: post.scheduled_date,
          status: post.status
        });

        // Enhanced duplicate check - check for ANY existing queue items or WordPress status
        const [queueCheck, wpCheck] = await Promise.all([
          // Check for ANY existing queue items, not just pending
          supabaseClient
            .from('publish_queue')
            .select('id, status')
            .eq('post_theme_id', post.id),
          
          // Double check WordPress status
          supabaseClient
            .from('post_themes')
            .select('wp_sent_date, wp_post_url')
            .eq('id', post.id)
            .single()
        ]);

        // Log check results
        console.log(`Check results for post ${post.id}:`, {
          hasQueueItems: queueCheck.data?.length > 0,
          queueStatuses: queueCheck.data?.map(q => q.status),
          wpSentDate: wpCheck.data?.wp_sent_date,
          wpPostUrl: wpCheck.data?.wp_post_url
        });

        // Skip if already in queue or published
        if (queueCheck.data?.length > 0) {
          console.log(`Post ${post.id} already has queue items:`, {
            count: queueCheck.data.length,
            statuses: queueCheck.data.map(q => q.status)
          });
          continue;
        }

        if (wpCheck.data?.wp_sent_date || wpCheck.data?.wp_post_url) {
          console.log(`Post ${post.id} appears to be already published:`, wpCheck.data);
          continue;
        }

        // Add to publish queue with additional safeguards
        const { data: queueJob, error: queueError } = await supabaseClient
          .from('publish_queue')
          .insert({
            post_theme_id: post.id,
            website_id: post.website_id, // Ensure website_id is set
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

    // After processing, double check for any items that got stuck during our processing
    const { data: newStalledItems } = await supabaseClient
      .from('publish_queue')
      .select('id, post_theme_id')
      .in('status', ['pending', 'processing'])
      .lt('created_at', stallCutoff);

    if (newStalledItems && newStalledItems.length > 0) {
      console.warn('Found new stalled items after processing:', newStalledItems);
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