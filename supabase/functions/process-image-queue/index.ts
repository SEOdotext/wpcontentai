// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Get allowed origins from environment variables
const ALLOWED_ORIGINS = {
  production: Deno.env.get('ALLOWED_ORIGINS_PROD')?.split(',') || ['https://contentgardener.ai'],
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

        // Mark job as processing
        await supabaseClient
          .from('image_generation_queue')
          .update({ status: 'processing' })
          .eq('id', job.id);

        // Call the image generation function with a timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

        try {
          const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/image-trigger', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${job.user_token}`
            },
            body: JSON.stringify({
              postId: job.post_theme_id,
              websiteId: job.website_id
            }),
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (!response.ok) {
            throw new Error(`Image generation failed: ${await response.text()}`);
          }

          const result = await response.json();
          console.log('Image generation result:', result);

          // Start polling for the image URL
          let attempts = 0;
          const maxAttempts = 30; // 30 attempts with 2-second intervals = 60 seconds total
          const interval = 2000; // 2 seconds

          while (attempts < maxAttempts) {
            // Check if the image has been generated
            const { data: postTheme, error } = await supabaseClient
              .from('post_themes')
              .select('image')
              .eq('id', job.post_theme_id)
              .single();

            if (error) {
              console.error('Error checking image status:', error);
            } else if (postTheme?.image) {
              // Image was generated successfully
              await supabaseClient
                .from('image_generation_queue')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  image_url: postTheme.image
                })
                .eq('id', job.id);

              return { jobId: job.id, status: 'completed', imageUrl: postTheme.image };
            }

            console.log(`Image not found, attempt ${attempts + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, interval));
            attempts++;
          }

          // If we get here, we've timed out waiting for the image
          throw new Error('Image generation timed out after 60 seconds');
        } catch (fetchError: any) {
          clearTimeout(timeout);
          if (fetchError.name === 'AbortError') {
            throw new Error('Image generation timed out after 60 seconds');
          }
          throw fetchError;
        }
      } catch (error: any) {
        console.error(`Error processing job ${job.id}:`, error);

        // Mark job as failed
        await supabaseClient
          .from('image_generation_queue')
          .update({
            status: 'failed',
            error: error.message
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
