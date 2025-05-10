// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Get allowed origins from environment variables
const ALLOWED_ORIGINS = {
  production: Deno.env.get('ALLOWED_ORIGINS_PROD')?.split(',') || ['https://contentgardener.ai', 'https://contentgardener.ai/'],
  staging: Deno.env.get('ALLOWED_ORIGINS_STAGING')?.split(',') || ['https://staging.contentgardener.ai', 'http://localhost:8080']
};

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

// Enhanced logging function to update queue job result
async function logToImageQueue(supabaseClient: any, jobId: string, level: string, message: string, metadata?: any) {
  console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');
  
  try {
    // First get current result to preserve existing data
    const { data: currentJob } = await supabaseClient
      .from('image_generation_queue')
      .select('result')
      .eq('id', jobId)
      .single();
    
    // Create or update logs array in result
    const currentResult = currentJob?.result || {};
    const logs = currentResult.logs || [];
    
    // Add new log entry
    logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    });
    
    // Update the result field with the new logs
    const { error } = await supabaseClient
      .from('image_generation_queue')
      .update({
        result: {
          ...currentResult,
          logs
        }
      })
      .eq('id', jobId);
      
    if (error) {
      console.error('Error updating log in result:', error);
    }
  } catch (error) {
    console.error('Error in logToImageQueue:', error);
  }
}

serve(async (req) => {
  // Get the origin from the request
  const origin = req.headers.get('origin');
  
  // Set CORS headers based on origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS.production[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting process-image-queue function');

    // Get pending image generation jobs
    const { data: pendingJobs, error: fetchError } = await supabaseClient
      .from('image_generation_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5); // Process 5 jobs at a time

    if (fetchError) {
      throw new Error(`Failed to fetch pending jobs: ${fetchError.message}`);
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingJobs.length} pending jobs`);

    // Process each job
    const results = await Promise.all(pendingJobs.map(async (job) => {
      try {
        console.log(`Processing job ${job.id} for post ${job.post_theme_id}`);
        await logToImageQueue(supabaseClient, job.id, 'info', 'Starting image generation', {
          postThemeId: job.post_theme_id
        });

        // Mark job as processing
        await supabaseClient
          .from('image_generation_queue')
          .update({ status: 'processing' })
          .eq('id', job.id);
        
        await logToImageQueue(supabaseClient, job.id, 'info', 'Calling image-trigger function');

        // Call the image generation function
        const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/image-trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'X-Queue-Processing': 'true',
            'X-Original-User-Token': job.user_token // Pass the original token for reference if needed
          },
          body: JSON.stringify({
            postId: job.post_theme_id,
            websiteId: job.website_id
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Check if this is a content policy violation
          const isPolicyViolation = errorText.includes('content_policy_violation') || 
                                    errorText.includes('safety system') ||
                                    errorText.includes('not allowed by our safety system');
          
          await logToImageQueue(supabaseClient, job.id, 'error', 'Image generation failed', {
            status: response.status,
            error: errorText,
            isPolicyViolation
          });
          
          // Mark job as failed with appropriate error messages
          await supabaseClient
            .from('image_generation_queue')
            .update({
              status: 'failed',
              error: isPolicyViolation 
                ? 'Image generation failed due to content policy violation' 
                : `Image generation failed: ${errorText}`,
              completed_at: new Date().toISOString(),
              result: {
                error: errorText,
                policyViolation: isPolicyViolation
              }
            })
            .eq('id', job.id);
          
          // Also update the post_themes table with the error
          await supabaseClient
            .from('post_themes')
            .update({ 
              image_generation_error: isPolicyViolation 
                ? 'Image generation failed due to content policy violation' 
                : `Image generation failed: ${errorText.substring(0, 255)}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.post_theme_id);
          
          throw new Error(`Image generation failed: ${errorText}`);
        }

        const result = await response.json();
        console.log('Image generation result:', result);
        await logToImageQueue(supabaseClient, job.id, 'info', 'Image generation result received', {
          success: !!result.imageUrl,
          imageUrl: result.imageUrl || null
        });

        if (result.imageUrl) {
          // Image was generated immediately
          await supabaseClient
            .from('image_generation_queue')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              image_url: result.imageUrl,
              result: {
                ...result,
                logs: result.logs || []
              }
            })
            .eq('id', job.id);
          
          await logToImageQueue(supabaseClient, job.id, 'info', 'Image generation completed', {
            imageUrl: result.imageUrl
          });

          // Update post_themes table with the image URL and ID
          if (result.imageId) {
            await supabaseClient
              .from('post_themes')
              .update({ 
                image: result.imageUrl,
                image_id: result.imageId 
              })
              .eq('id', job.post_theme_id);
          } else {
            await supabaseClient
              .from('post_themes')
              .update({ image: result.imageUrl })
              .eq('id', job.post_theme_id);
          }

          return { jobId: job.id, status: 'completed', imageUrl: result.imageUrl, imageId: result.imageId };
        } else {
          // Image is still being generated
          await logToImageQueue(supabaseClient, job.id, 'info', 'Image generation in progress');
          return { jobId: job.id, status: 'processing' };
        }
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        await logToImageQueue(supabaseClient, job.id, 'error', 'Image generation failed', {
          error: error.message
        });

        // Mark job as failed
        await supabaseClient
          .from('image_generation_queue')
          .update({
            status: 'failed',
            error: error.message,
            result: {
              error: error.message,
              logs: (await supabaseClient
                .from('image_generation_queue')
                .select('result')
                .eq('id', job.id)
                .single()).data?.result?.logs || []
            }
          })
          .eq('id', job.id);

        return { jobId: job.id, status: 'failed', error: error.message };
      }
    }));

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-image-queue function:', error);
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-image-queue' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
