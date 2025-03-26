import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
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