// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Get allowed origins
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'https://contentgardener.ai',
  'https://vehcghewfnjkwlwmmrix.supabase.co'
];

// Function to determine if origin is allowed
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

serve(async (req) => {
  console.log('Starting process-publish-queue');

  // Get the origin from the request
  const origin = req.headers.get('origin');
  
  // Set CORS headers based on origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-system-auth',
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

    // Get pending jobs
    const { data: pendingJobs, error: jobsError } = await supabaseClient
      .from('publish_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (jobsError) {
      throw new Error(`Failed to fetch pending jobs: ${jobsError.message}`);
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const job = pendingJobs[0];
    console.log('Processing publish queue job for post_theme_id:', job.post_theme_id);

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