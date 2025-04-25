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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    })
  }

  try {
    console.log('Received request:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    })

    // Validate request method
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`)
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    console.log('Auth header present')

    // Parse request body
    const body = await req.json()
    console.log('Request body:', body)

    // Validate required fields
    if (!body.website_url) {
      throw new Error('website_url is required')
    }
    if (!body.website_id) {
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

    // First, create a temporary website record
    console.log('Creating temporary website record...')
    const { error: websiteError } = await supabaseClient
      .from('websites')
      .insert({
        id: body.website_id,
        url: body.website_url,
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

    // Now check for existing onboarding record
    console.log('Checking for existing onboarding record...')
    const { data: existingData, error: fetchError } = await supabaseClient
      .from('onboarding')
      .select('*')
      .eq('website_id', body.website_id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching existing record:', fetchError)
      throw fetchError
    }

    console.log('Existing data:', existingData)

    // Prepare data for upsert
    const data = {
      id: existingData?.id || crypto.randomUUID(),
      website_id: body.website_id,
      website_url: body.website_url,
      status: body.status || 'started',
      post_theme_suggestions: body.post_theme_suggestions || existingData?.post_theme_suggestions || null,
      post_theme_content: body.post_theme_content || existingData?.post_theme_content || null,
      scheduling_settings: body.scheduling_settings || existingData?.scheduling_settings || null,
      updated_at: new Date().toISOString(),
      created_at: existingData?.created_at || new Date().toISOString()
    }

    console.log('Upserting onboarding data:', data)

    const { error: upsertError } = await supabaseClient
      .from('onboarding')
      .upsert(data)

    if (upsertError) {
      console.error('Error upserting data:', upsertError)
      throw upsertError
    }

    console.log('Successfully stored onboarding analytics')
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in store-onboarding-analytics:', error)
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