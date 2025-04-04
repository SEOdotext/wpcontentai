import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOnboardingParams {
  website_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { website_id } = await req.json() as CreateOnboardingParams;

    if (!website_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameter: website_id'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if website exists
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, url')
      .eq('id', website_id)
      .single();

    if (websiteError || !website) {
      return new Response(
        JSON.stringify({
          error: 'Website not found',
          details: websiteError?.message || 'Website with provided ID does not exist'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create an entry in the onboarding table
    const { data: onboardingData, error: onboardingError } = await supabase
      .from('onboarding')
      .insert({
        website_id: website_id,
        status: 'started',
        website_indexing: false,
        keyword_suggestions: false,
        post_ideas: false,
        client_thumbs: []
      })
      .select()
      .single();

    if (onboardingError) {
      return new Response(
        JSON.stringify({
          error: 'Failed to create onboarding entry',
          details: onboardingError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the created onboarding entry
    return new Response(
      JSON.stringify({
        success: true,
        data: onboardingData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 