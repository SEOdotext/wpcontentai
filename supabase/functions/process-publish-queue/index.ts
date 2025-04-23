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

// Enhanced logging function
async function logToQueue(supabaseClient: any, jobId: string, level: string, message: string, metadata?: any) {
  console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');
  
  try {
    // First get current result to preserve existing logs
    const { data: currentJob } = await supabaseClient
      .from('publish_queue')
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
      .from('publish_queue')
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
    console.error('Error in logToQueue:', error);
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

    // Log function start
    console.log('Starting process-publish-queue function');

    // Get multiple pending jobs from the queue (increased from 1 to 5)
    const { data: jobs, error: jobError } = await supabaseClient
      .from('publish_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (jobError) {
      console.error('Error fetching jobs from queue:', jobError);
      throw new Error(`Failed to fetch jobs from queue: ${jobError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('No pending jobs in queue');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No pending jobs in queue',
          queueStatus: 'empty'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${jobs.length} jobs`);

    // Process all jobs concurrently
    const results = await Promise.all(jobs.map(async (job) => {
      try {
        await logToQueue(supabaseClient, job.id, 'info', 'Starting job processing', {
          function: 'process-publish-queue',
          jobId: job.id,
          postThemeId: job.post_theme_id
        });

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
          await logToQueue(supabaseClient, job.id, 'error', 'Failed to update job status', {
            error: updateError.message
          });
          throw new Error(`Failed to update job status: ${updateError.message}`);
        }

        await logToQueue(supabaseClient, job.id, 'info', 'Calling generate-and-publish function', {
          postThemeId: job.post_theme_id
        });

        // Call the generate-and-publish function with the job data
        const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-and-publish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'X-Queue-Processing': 'true',
            'X-Original-User-Token': job.user_token
          },
          body: JSON.stringify({ postThemeId: job.post_theme_id })
        });

        const result = await response.json();
        
        await logToQueue(supabaseClient, job.id, response.ok ? 'info' : 'error', 
          response.ok ? 'Generate and publish completed' : 'Generate and publish failed', 
          { 
            statusCode: response.status,
            result: result
          }
        );

        // Update job status based on result
        const { error: finalUpdateError } = await supabaseClient
          .from('publish_queue')
          .update({
            status: response.ok ? 'completed' : 'failed',
            result: {
              ...result,
              logs: result.logs || []
            },
            completed_at: new Date().toISOString(),
            error: response.ok ? null : result.error
          })
          .eq('id', job.id);

        if (finalUpdateError) {
          console.error('Error updating final job status:', finalUpdateError);
          await logToQueue(supabaseClient, job.id, 'error', 'Failed to update final job status', {
            error: finalUpdateError.message
          });
          throw new Error(`Failed to update final job status: ${finalUpdateError.message}`);
        }

        await logToQueue(supabaseClient, job.id, 'info', 'Job processing completed', {
          status: response.ok ? 'completed' : 'failed'
        });

        return {
          jobId: job.id,
          success: true,
          result
        };
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        return {
          jobId: job.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }));

    return new Response(
      JSON.stringify({
        success: true,
        results,
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