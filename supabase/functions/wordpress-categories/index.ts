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
    const { websiteId, action } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!websiteId) {
      throw new Error('Missing required field: websiteId');
    }

    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Extract the token from the Authorization header
    const token = authHeader.replace('Bearer ', '');

    // Get WordPress settings for the website
    const { data: wpSettings, error: wpError } = await supabaseClient
      .from('wordpress_settings')
      .select('*')
      .eq('website_id', websiteId)
      .single();

    if (wpError || !wpSettings) {
      throw new Error('WordPress settings not found');
    }

    if (action === 'fetch') {
      // Fetch categories from WordPress
      const wpResponse = await fetch(`${wpSettings.wp_url}/wp-json/wp/v2/categories`, {
        headers: {
          'Authorization': `Basic ${btoa(`${wpSettings.wp_username}:${wpSettings.wp_application_password}`)}`
        }
      });

      if (!wpResponse.ok) {
        throw new Error(`WordPress API error: ${wpResponse.status} ${wpResponse.statusText}`);
      }

      const categories = await wpResponse.json();
      console.log('Fetched categories from WordPress:', categories);

      // Delete existing categories for this website
      const { error: deleteError } = await supabaseClient
        .from('wordpress_categories')
        .delete()
        .eq('website_id', websiteId);

      if (deleteError) {
        console.error('Error deleting existing categories:', deleteError);
        throw new Error('Failed to delete existing categories');
      }

      console.log(`Inserting ${categories.length} WordPress categories for website ${websiteId}`);

      // Insert new categories
      for (const category of categories) {
        const { data: insertedCategory, error: insertError } = await supabaseClient
          .from('wordpress_categories')
          .insert({
            website_id: websiteId,
            wp_category_id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description || '',
            parent_id: category.parent || 0,
            count: category.count || 0
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting category:', insertError, 'Category:', category);
          throw new Error(`Failed to insert category: ${category.name}`);
        }
        
        console.log(`Inserted category: ${category.name} with ID: ${insertedCategory.id}, WP ID: ${category.id}`);
      }

      // Fetch the inserted categories to return in the response
      const { data: insertedCategories, error: fetchError } = await supabaseClient
        .from('wordpress_categories')
        .select('*')
        .eq('website_id', websiteId);
        
      if (fetchError) {
        console.error('Error fetching inserted categories:', fetchError);
      } else {
        console.log(`Successfully inserted and fetched ${insertedCategories?.length || 0} categories`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Categories fetched and stored successfully',
          categories: insertedCategories
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in wordpress-categories function:', error);
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