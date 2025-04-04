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
    const { websiteId } = await req.json();
    const authHeader = req.headers.get('Authorization');
    console.log('Received request for websiteId:', websiteId);

    if (!websiteId) {
      throw new Error('Missing required field: websiteId');
    }

    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Extract the token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    console.log('Using auth token for internal function calls');

    // Get WordPress settings for the website
    const { data: wpSettings, error: wpError } = await supabaseClient
      .from('wordpress_settings')
      .select('*')
      .eq('website_id', websiteId)
      .single();

    if (wpError) {
      console.error('Error fetching WordPress settings:', wpError);
      throw new Error(`Failed to fetch WordPress settings: ${wpError.message}`);
    }

    if (!wpSettings) {
      throw new Error(`WordPress settings not found for website ID: ${websiteId}`);
    }

    // Fetch categories from WordPress
    const wpUrl = wpSettings.wp_url.replace(/\/+$/, ''); // Remove trailing slashes
    const categoriesUrl = `${wpUrl}/wp-json/wp/v2/categories?per_page=100`;
    
    console.log('Fetching categories from WordPress:', categoriesUrl);
    
    const response = await fetch(categoriesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${wpSettings.wp_username}:${wpSettings.wp_application_password}`)}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching categories from WordPress:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch categories from WordPress: ${response.status} ${response.statusText}`);
    }

    const categories = await response.json();
    console.log(`Successfully fetched ${categories.length} categories from WordPress`);

    // Store categories in the database
    const { error: upsertError } = await supabaseClient
      .from('wordpress_categories')
      .upsert(
        categories.map((category: any) => ({
          website_id: websiteId,
          wp_category_id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          parent_id: category.parent,
          count: category.count
        })),
        { onConflict: 'website_id,wp_category_id' }
      );

    if (upsertError) {
      console.error('Error upserting categories:', upsertError);
      throw new Error(`Failed to store categories: ${upsertError.message}`);
    }

    // Update the categories field in wordpress_settings
    const { error: updateError } = await supabaseClient
      .from('wordpress_settings')
      .update({
        categories: categories.map((category: any) => ({
          id: category.id,
          name: category.name,
          slug: category.slug
        }))
      })
      .eq('website_id', websiteId);

    if (updateError) {
      console.error('Error updating wordpress_settings categories:', updateError);
      throw new Error(`Failed to update wordpress_settings categories: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        categories
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-wordpress-categories function:', error);
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