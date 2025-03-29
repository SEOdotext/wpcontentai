import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://websitetexts.com',
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

      // Insert new categories
      const { error: insertError } = await supabaseClient
        .from('wordpress_categories')
        .insert(
          categories.map((category: any) => ({
            website_id: websiteId,
            wp_category_id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description || '',
            parent_id: category.parent || 0,
            count: category.count || 0
          }))
        );

      if (insertError) {
        console.error('Error inserting categories:', insertError);
        throw new Error('Failed to insert categories');
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Categories fetched and stored successfully',
          categories
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