import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Loading store-onboarding-analytics function...')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Helper function to extract website name from URL
const extractWebsiteName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    // Remove www. if present
    const domain = hostname.replace(/^www\./, '');
    // Get the main domain name (e.g., 'example' from 'example.com')
    const parts = domain.split('.');
    if (parts.length >= 2) {
      // Capitalize first letter
      return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
    }
    return domain;
  } catch (error) {
    console.error('Error extracting website name:', error);
    return 'Website';
  }
}

serve(async (req) => {
  let requestBody;
  
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('Handling CORS preflight request');
      return new Response(null, {
        headers: corsHeaders
      })
    }

    // Parse request body early so we have access to it in catch block
    requestBody = await req.json();
    console.log('Received request body:', requestBody);

    // Validate request method
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`)
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header found in request');
      throw new Error('No authorization header')
    }

    // Validate required fields
    if (!requestBody.website_url) {
      throw new Error('website_url is required')
    }
    if (!requestBody.website_id) {
      throw new Error('website_id is required')
    }

    // Initialize Supabase client with service role to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        }
      }
    )

    // Check if this is a new attempt with a previous website_id
    if (requestBody.previous_website_id) {
      console.log('Found previous website_id:', requestBody.previous_website_id);
      
      // Check if the previous website_id exists and is still in 'started' state
      const { data: previousData, error: previousError } = await supabaseClient
        .from('onboarding')
        .select('*')
        .eq('website_id', requestBody.previous_website_id)
        .eq('status', 'started')
        .maybeSingle();
      
      if (previousError) {
        console.error('Error checking previous website:', previousError);
      } else if (previousData) {
        console.log('Previous website found in started state, preserving it');
      }
    }

    // First, create a temporary website record
    console.log('Creating temporary website record...')
    const { error: websiteError } = await supabaseClient
      .from('websites')
      .insert({
        id: requestBody.website_id,
        url: requestBody.website_url,
        name: 'Temporary Website',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        language: 'en',
        enable_ai_image_generation: false,
        page_import_limit: 500,
        key_content_limit: 10
      })

    if (websiteError && websiteError.code !== '23505') { // Ignore duplicate key errors
      console.error('Error creating website:', websiteError)
      throw websiteError
    }

    // Check for existing onboarding record
    const { data: existingData, error: fetchError } = await supabaseClient
      .from('onboarding')
      .select('*')
      .eq('website_id', requestBody.website_id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching existing record:', fetchError)
      throw fetchError
    }

    // Prepare error data if present
    let errorData = null;
    if (requestBody.error) {
      // Parse error message to extract details if it's a string containing JSON
      let workerResponse = null;
      let errorDetails = null;
      let errorStep = null;

      // Try to parse error message if it contains JSON
      if (typeof requestBody.error === 'string') {
        const errorMatch = requestBody.error.match(/Function .+ returned status \d+: (.+)$/);
        if (errorMatch) {
          try {
            const parsedError = JSON.parse(errorMatch[1]);
            workerResponse = parsedError;
            errorDetails = parsedError.message;
          } catch (e) {
            console.error('Failed to parse error JSON:', e);
          }
        }

        // Try to extract step information
        const stepMatch = requestBody.error.match(/Error in step (\d+):/);
        if (stepMatch) {
          errorStep = stepMatch[1];
        }
      }

      errorData = {
        message: requestBody.error,
        timestamp: new Date().toISOString(),
        details: errorDetails,
        step: errorStep,
        worker_response: workerResponse
      };
    }

    // Prepare data for upsert
    const data = {
      id: existingData?.id || crypto.randomUUID(),
      website_id: requestBody.website_id,
      website_url: requestBody.website_url,
      status: errorData ? 'error' : (requestBody.status || existingData?.status || 'started'),
      post_theme_suggestions: requestBody.post_theme_suggestions || existingData?.post_theme_suggestions || null,
      post_theme_content: requestBody.post_theme_content || existingData?.post_theme_content || null,
      scheduling_settings: requestBody.scheduling_settings || existingData?.scheduling_settings || null,
      error: errorData ? JSON.stringify(errorData) : null,
      updated_at: new Date().toISOString(),
      created_at: existingData?.created_at || new Date().toISOString()
    }

    console.log('Upserting onboarding data:', {
      ...data,
      error: errorData ? 'Error data present' : null // Log presence of error without full details
    })

    const { error: upsertError } = await supabaseClient
      .from('onboarding')
      .upsert(data)

    if (upsertError) {
      console.error('Error upserting data:', upsertError)
      throw upsertError
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in store-onboarding-analytics:', error)
    
    // If we have a website_id from the request, store the error
    if (requestBody?.website_id) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          {
            auth: {
              persistSession: false,
            }
          }
        )

        // Get any existing error data
        const { data: existingRecord } = await supabaseClient
          .from('onboarding')
          .select('error')
          .eq('website_id', requestBody.website_id)
          .single();

        const errorData = {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          details: error.details || null,
          step: error.step || null,
          worker_response: error.worker_response || null,
          previous_error: existingRecord?.error || null // Preserve previous error
        };

        // Store error in onboarding table
        const { error: errorUpsertError } = await supabaseClient
          .from('onboarding')
          .upsert({
            website_id: requestBody.website_id,
            status: 'error', // Always set status to error
            error: JSON.stringify(errorData),
            updated_at: new Date().toISOString()
          })

        if (errorUpsertError) {
          console.error('Failed to store error in database:', errorUpsertError)
        }
      } catch (errorLoggingError) {
        console.error('Failed to log error to database:', errorLoggingError)
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}) 