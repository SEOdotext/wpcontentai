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

    // Get the next job from the queue
    const { data: jobs, error: jobError } = await supabaseClient
      .from('publish_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (jobError) {
      console.error('Error fetching job from queue:', jobError);
      throw new Error(`Failed to fetch job from queue: ${jobError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No pending jobs in queue',
          queueStatus: 'empty'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const job = jobs[0];
    console.log('Processing job:', job.id);

    // Update job status to processing
    const { error: updateError } = await supabaseClient
      .from('publish_queue')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('Error updating job status:', updateError);
      throw new Error(`Failed to update job status: ${updateError.message}`);
    }

    // Call the generate-and-publish function with the job data
    const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-and-publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${job.user_token}`,
        'X-Queue-Processing': 'true'
      },
      body: JSON.stringify({ postThemeId: job.post_theme_id })
    });

    const result = await response.json();

    // Update job status based on result
    const { error: finalUpdateError } = await supabaseClient
      .from('publish_queue')
      .update({
        status: response.ok ? 'completed' : 'failed',
        result: result,
        completed_at: new Date().toISOString(),
        error: response.ok ? null : result.error
      })
      .eq('id', job.id);

    if (finalUpdateError) {
      console.error('Error updating final job status:', finalUpdateError);
      throw new Error(`Failed to update final job status: ${finalUpdateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        job: job,
        result: result,
        queueStatus: 'processed'
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