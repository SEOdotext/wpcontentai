// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define the allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://contentgardener.ai',
  'https://vehcghewfnjkwlwmmrix.supabase.co'
];

// CORS headers setup
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-system-auth, x-queue-processing',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Type definitions
interface PostTheme {
  id: string;
  status: string;
  website_id: string;
  websites?: {
    id: string;
    wordpress_settings?: {
      is_connected: boolean;
    }
  }
}

// Helper function to check if the origin is allowed
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

/**
 * Checks for posts scheduled for today and adds them to the publish queue
 * based on their current status:
 * - approved: needs full processing (text + image + publish)
 * - textgenerated: needs image + publishing
 * - generated: needs publishing only
 */
async function checkScheduledPosts(supabaseClient: any) {
  console.log("📅 Checking for scheduled posts...");
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all post themes scheduled for today or earlier that have the right status
    // and are from websites with working WordPress connections
    const { data: scheduledPosts, error } = await supabaseClient
      .from("post_themes")
      .select(`
        id,
        status,
        website_id,
        websites!inner(
          id,
          wordpress_settings!inner(is_connected)
        )
      `)
      .lte("scheduled_date", today.toISOString())
      .in("status", ["approved", "generated", "textgenerated"])
      .eq("websites.wordpress_settings.is_connected", true);
    
    if (error) {
      console.error("Error fetching scheduled posts:", error);
      return { success: false, error };
    }
    
    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log("No scheduled posts found that meet the criteria");
      return { success: true, processed: 0 };
    }
    
    console.log(`Found ${scheduledPosts.length} posts to process`);
    
    // Add each post to the queue with appropriate handling based on status
    const queuePromises = scheduledPosts.map(async (post: PostTheme) => {
      // Add to publish queue
      const { data: queueItem, error: queueError } = await supabaseClient
        .from("publish_queue")
        .insert({
          post_theme_id: post.id,
          status: "pending",
          // Include a system token for authentication
          user_token: "system", // This indicates a system-triggered job
        })
        .select()
        .single();
      
      if (queueError) {
        console.error(`Error adding post ${post.id} to queue:`, queueError);
        return { success: false, error: queueError };
      }
      
      console.log(`Added post ${post.id} to queue - current post status: ${post.status}`);
      return { success: true, queueItem };
    });
    
    const results = await Promise.all(queuePromises);
    const successCount = results.filter(r => r.success).length;
    
    return {
      success: true,
      processed: successCount,
      total: scheduledPosts.length,
    };
  } catch (error) {
    console.error("Unexpected error in checkScheduledPosts:", error);
    return { success: false, error };
  }
}

serve(async (req) => {
  console.log('🔄 Process publish queue function called');
  
  // Log headers for debugging
  const headersObj = Object.fromEntries(req.headers.entries());
  console.log('Request headers:', JSON.stringify(headersObj, null, 2));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Check if using system auth
    const systemAuthHeader = req.headers.get('X-System-Auth');
    const isSystemAuth = systemAuthHeader === 'true';
    console.log('Is system auth request:', isSystemAuth);
    
    // Skip JWT validation for system auth requests
    if (!isSystemAuth) {
      console.log('Verifying JWT token');
      // Here we could validate JWT but will skip for now
    } else {
      console.log('Using system authentication, skipping JWT validation');
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // First, check for any scheduled posts and add them to the queue
    const scheduledPostsResult = await checkScheduledPosts(supabaseClient);
    console.log("Scheduled posts check result:", scheduledPostsResult);
    
    // Get all pending jobs in the queue
    const { data: jobs, error: fetchError } = await supabaseClient
      .from('publish_queue')
      .select('*, post_themes!inner(status)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching pending jobs:', fetchError);
      throw new Error(`Failed to fetch pending jobs: ${fetchError.message}`);
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('No pending jobs in queue');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No pending jobs in queue',
          queueStatus: 'empty',
          scheduledPostsAdded: scheduledPostsResult.processed || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const job = jobs[0];
    console.log('Processing job:', job.id, 'Current status:', job.status, 'Post theme ID:', job.post_theme_id, 'Post status:', job.post_themes?.status);

    // Update job status to processing
    console.log('Updating job to processing status:', job.id);
    const { data: updateData, error: updateError } = await supabaseClient
      .from('publish_queue')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .select();

    if (updateError) {
      console.error('Error updating job status:', updateError);
      throw new Error(`Failed to update job status: ${updateError.message}`);
    }
    
    console.log('Job updated to processing:', updateData && updateData.length > 0 ? 'Yes' : 'No', 
      updateData && updateData.length > 0 ? `New status: ${updateData[0].status}` : 'No update data returned');

    // Call the generate-and-publish function with the job data
    console.log('Calling generate-and-publish function with system auth');
    
    // Determine how to process based on post theme status
    const postStatus = job.post_themes?.status || 'approved';
    let processingType;
    
    switch (postStatus) {
      case 'approved':
        processingType = 'full';
        break;
      case 'textgenerated':
        processingType = 'with_image';
        break;
      case 'generated':
        processingType = 'publish_only';
        break;
      default:
        processingType = 'full';
    }
    
    console.log(`Processing based on post status: ${postStatus} -> ${processingType}`);
    
    const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-and-publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''}`,
        'X-System-Auth': 'true',
        'X-Queue-Processing': 'true'
      },
      body: JSON.stringify({ 
        postThemeId: job.post_theme_id,
        processingType: processingType
      })
    });

    console.log('Generate-and-publish response status:', response.status);
    
    // Try to parse the response as JSON but handle errors
    let result;
    let rawText = '';
    try {
      result = await response.json();
      console.log('Generate-and-publish result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error parsing response:', error);
      rawText = await response.text();
      console.log('Raw response text:', rawText);
      result = { error: 'Failed to parse response', rawText };
    }

    // Update job status based on result
    console.log('Updating final job status to:', response.ok ? 'completed' : 'failed');
    const { data: finalUpdateData, error: finalUpdateError } = await supabaseClient
      .from('publish_queue')
      .update({
        status: response.ok ? 'completed' : 'failed',
        result: {
          postThemeId: job.post_theme_id,
          postStatus: postStatus,
          responseStatus: response.status,
          processingTime: `${Date.now() - new Date(job.created_at).getTime()}ms`,
          responseData: result,
          processedAt: new Date().toISOString(),
          success: response.ok,
          processingType: processingType,
          rawResponseText: rawText || undefined
        },
        completed_at: new Date().toISOString(),
        error: response.ok ? null : (result.error || 'Unknown error')
      })
      .eq('id', job.id)
      .select();

    if (finalUpdateError) {
      console.error('Error updating final job status:', finalUpdateError);
      throw new Error(`Failed to update final job status: ${finalUpdateError.message}`);
    }
    
    console.log('Job final update completed:', finalUpdateData && finalUpdateData.length > 0 ? 'Yes' : 'No',
      finalUpdateData && finalUpdateData.length > 0 ? `Final status: ${finalUpdateData[0].status}` : 'No final update data returned');

    // Get the updated job state
    console.log('Fetching updated job state for reporting');
    const { data: updatedJob, error: getJobError } = await supabaseClient
      .from('publish_queue')
      .select('*')
      .eq('id', job.id)
      .single();
    
    if (getJobError) {
      console.error('Error fetching updated job:', getJobError);
      // Continue with the original job if we can't get the updated one
    }

    return new Response(
      JSON.stringify({
        success: true,
        job: updatedJob || job,
        result: result,
        queueStatus: 'processed',
        scheduledPostsAdded: scheduledPostsResult.processed || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-publish-queue function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        queueStatus: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
}); 