import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Get allowed origins from environment variables
const ALLOWED_ORIGINS = {
  production: Deno.env.get('ALLOWED_ORIGINS_PROD')?.split(',') || ['https://websitetexts.com'],
  staging: Deno.env.get('ALLOWED_ORIGINS_STAGING')?.split(',') || ['https://staging.websitetexts.com', 'http://localhost:8080']
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

    // Get the request body and authorization header
    const { websiteId, categories } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!websiteId || !categories || !Array.isArray(categories)) {
      throw new Error('Missing required fields: websiteId and categories array');
    }

    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Get WordPress settings
    const { data: wpSettings, error: wpError } = await supabaseClient
      .from('wordpress_settings')
      .select('*')
      .eq('website_id', websiteId)
      .single();

    if (wpError) {
      throw new Error(`Failed to fetch WordPress settings: ${wpError.message}`);
    }

    if (!wpSettings) {
      throw new Error(`WordPress settings not found for website ID: ${websiteId}`);
    }

    // Create Basic Auth header
    const auth = btoa(`${wpSettings.wp_username}:${wpSettings.wp_application_password}`);

    // Push each category to WordPress
    const results = [];
    for (const category of categories) {
      try {
        // Create category in WordPress
        const wpResponse = await fetch(`${wpSettings.wp_url}/wp-json/wp/v2/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify({
            name: category.name,
            slug: category.slug,
            description: category.description || ''
          })
        });

        if (!wpResponse.ok) {
          const errorText = await wpResponse.text();
          throw new Error(`Failed to create category in WordPress: ${wpResponse.status} ${wpResponse.statusText} - ${errorText}`);
        }

        const wpCategory = await wpResponse.json();
        results.push({
          success: true,
          category: wpCategory
        });
      } catch (error) {
        results.push({
          success: false,
          category: category,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in push-categories function:', error);
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