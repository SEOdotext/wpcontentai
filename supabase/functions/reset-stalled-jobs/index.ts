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

// Create a centralized logging function
function logOperation(operation: string, count: number | null, error: any = null) {
  const timestamp = new Date().toISOString();
  const status = error ? 'failed' : 'success';
  const message = error 
    ? `Failed to reset ${operation}: ${error.message}`
    : `Reset ${count} ${operation}`;
  
  console.log(`[${timestamp}] [${status.toUpperCase()}] ${message}`);
  
  return {
    timestamp,
    operation,
    status,
    count,
    error: error ? error.message : null
  };
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

    console.log('Starting reset-stalled-jobs function');
    const logs = [];

    // Define the threshold for stalled jobs (jobs that have been processing for more than 10 minutes)
    const stalledThreshold = new Date();
    stalledThreshold.setMinutes(stalledThreshold.getMinutes() - 10);
    const stalledThresholdStr = stalledThreshold.toISOString();

    logs.push(logOperation('threshold_calculation', null));
    logs.push({
      timestamp: new Date().toISOString(),
      operation: 'threshold_details',
      stalledThreshold: stalledThresholdStr,
      pendingThreshold: null // Will be set later
    });

    // Find and reset stalled publish jobs
    try {
      const { data: stalledPublishJobs, error: pubError } = await supabaseClient
        .from('publish_queue')
        .update({
          status: 'failed',
          error: 'Job reset due to timeout',
          completed_at: new Date().toISOString(),
          result: {
            resetReason: 'Job stalled',
            resetTime: new Date().toISOString(),
            stalledThreshold: stalledThresholdStr
          }
        })
        .match({ status: 'processing' })
        .lt('started_at', stalledThresholdStr)
        .select();

      logs.push(logOperation('stalled_publish_jobs', stalledPublishJobs?.length || 0, pubError));
      
      if (pubError) {
        throw new Error(`Failed to reset stalled publish jobs: ${pubError.message}`);
      }
    } catch (error) {
      logs.push(logOperation('stalled_publish_jobs', null, error));
      throw error;
    }

    // Find and reset stalled image generation jobs
    try {
      const { data: stalledImageJobs, error: imgError } = await supabaseClient
        .from('image_generation_queue')
        .update({
          status: 'failed',
          error: 'Job reset due to timeout',
          completed_at: new Date().toISOString(),
          result: {
            resetReason: 'Job stalled',
            resetTime: new Date().toISOString(),
            stalledThreshold: stalledThresholdStr
          }
        })
        .match({ status: 'processing' })
        .lt('updated_at', stalledThresholdStr)
        .select();

      logs.push(logOperation('stalled_image_jobs', stalledImageJobs?.length || 0, imgError));
      
      if (imgError) {
        throw new Error(`Failed to reset stalled image jobs: ${imgError.message}`);
      }
    } catch (error) {
      logs.push(logOperation('stalled_image_jobs', null, error));
      throw error;
    }

    // Reset any pending jobs that are too old (been waiting for more than 1 hour)
    const pendingThreshold = new Date();
    pendingThreshold.setHours(pendingThreshold.getHours() - 1);
    const pendingThresholdStr = pendingThreshold.toISOString();
    
    logs.push({
      timestamp: new Date().toISOString(),
      operation: 'threshold_details',
      stalledThreshold: stalledThresholdStr,
      pendingThreshold: pendingThresholdStr
    });

    // Reset old pending publish jobs
    try {
      const { data: oldPendingPubJobs, error: pendingPubError } = await supabaseClient
        .from('publish_queue')
        .update({
          status: 'failed',
          error: 'Job reset due to being in pending state too long',
          completed_at: new Date().toISOString(),
          result: {
            resetReason: 'Pending too long',
            resetTime: new Date().toISOString(),
            pendingThreshold: pendingThresholdStr
          }
        })
        .match({ status: 'pending' })
        .lt('created_at', pendingThresholdStr)
        .select();

      logs.push(logOperation('old_pending_publish_jobs', oldPendingPubJobs?.length || 0, pendingPubError));
      
      if (pendingPubError) {
        throw new Error(`Failed to reset old pending publish jobs: ${pendingPubError.message}`);
      }
    } catch (error) {
      logs.push(logOperation('old_pending_publish_jobs', null, error));
      throw error;
    }

    // Reset old pending image jobs
    try {
      const { data: oldPendingImgJobs, error: pendingImgError } = await supabaseClient
        .from('image_generation_queue')
        .update({
          status: 'failed',
          error: 'Job reset due to being in pending state too long',
          completed_at: new Date().toISOString(),
          result: {
            resetReason: 'Pending too long',
            resetTime: new Date().toISOString(),
            pendingThreshold: pendingThresholdStr
          }
        })
        .match({ status: 'pending' })
        .lt('created_at', pendingThresholdStr)
        .select();

      logs.push(logOperation('old_pending_image_jobs', oldPendingImgJobs?.length || 0, pendingImgError));
      
      if (pendingImgError) {
        throw new Error(`Failed to reset old pending image jobs: ${pendingImgError.message}`);
      }
    } catch (error) {
      logs.push(logOperation('old_pending_image_jobs', null, error));
      throw error;
    }

    logs.push({
      timestamp: new Date().toISOString(),
      operation: 'complete',
      status: 'success'
    });

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        resetStalledPublishJobs: stalledPublishJobs?.length || 0,
        resetStalledImageJobs: stalledImageJobs?.length || 0,
        resetOldPendingPublishJobs: oldPendingPubJobs?.length || 0,
        resetOldPendingImageJobs: oldPendingImgJobs?.length || 0,
        logs: logs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reset-stalled-jobs function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        logs: logs
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
}); 