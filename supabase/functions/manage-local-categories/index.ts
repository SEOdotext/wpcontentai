import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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
    const { websiteId, categoryId, action } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!websiteId) {
      throw new Error('Missing required field: websiteId');
    }

    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Handle different actions
    if (action === 'delete' && categoryId) {
      // Delete category from local database
      const { error: deleteError } = await supabaseClient
        .from('wordpress_categories')
        .delete()
        .eq('website_id', websiteId)
        .eq('wp_category_id', categoryId);

      if (deleteError) {
        throw new Error(`Failed to delete category: ${deleteError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Category deleted successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default response for unsupported actions
    return new Response(
      JSON.stringify({
        error: 'Unsupported action'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );

  } catch (error) {
    console.error('Error in manage-local-categories function:', error);
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