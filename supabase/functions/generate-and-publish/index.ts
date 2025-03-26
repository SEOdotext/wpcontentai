// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get the request body
    const { postThemeId } = await req.json();

    if (!postThemeId) {
      throw new Error('Missing required field: postThemeId');
    }

    // Get the post theme details from the database
    const { data: postTheme, error: postThemeError } = await supabaseClient
      .from('post_themes')
      .select('*')
      .eq('id', postThemeId)
      .single();

    if (postThemeError) {
      throw new Error('Failed to fetch post theme from database');
    }

    if (!postTheme) {
      throw new Error('Post theme not found');
    }

    // Get website settings
    const { data: website, error: websiteError } = await supabaseClient
      .from('websites')
      .select('*')
      .eq('id', postTheme.website_id)
      .single();

    if (websiteError) {
      throw new Error('Failed to fetch website settings');
    }

    // Get WordPress settings
    const { data: wpSettings, error: wpError } = await supabaseClient
      .from('wordpress_settings')
      .select('*')
      .eq('website_id', postTheme.website_id)
      .single();

    if (wpError) {
      throw new Error('Failed to fetch WordPress settings');
    }

    if (!wpSettings) {
      throw new Error('WordPress settings not found');
    }

    // Step 1: Generate content
    console.log('Generating content for post:', postThemeId);
    const contentResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-content-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({ postThemeId })
    });

    if (!contentResponse.ok) {
      throw new Error('Failed to generate content');
    }

    // Step 2: Generate image if enabled
    let imageUrl = null;
    if (website.enable_ai_image_generation) {
      console.log('Generating image for post:', postThemeId);
      const imageResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          postId: postThemeId,
          websiteId: postTheme.website_id,
          content: postTheme.post_content
        })
      });

      if (imageResponse.ok) {
        const imageResult = await imageResponse.json();
        imageUrl = imageResult.imageUrl;
      }
    }

    // Step 3: Send to WordPress
    console.log('Sending post to WordPress:', postThemeId);
    const wpResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/wordpress-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        post_theme_id: postThemeId,
        action: 'create',
        status: wpSettings.publish_status || 'draft'
      })
    });

    if (!wpResponse.ok) {
      throw new Error('Failed to send post to WordPress');
    }

    const wpResult = await wpResponse.json();

    // Update post theme with final status
    const { error: updateError } = await supabaseClient
      .from('post_themes')
      .update({
        status: 'published',
        wp_sent_date: new Date().toISOString(),
        wp_post_id: wpResult.post.id,
        wp_post_url: wpResult.post.link
      })
      .eq('id', postThemeId);

    if (updateError) {
      console.error('Error updating post theme:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: wpResult.post
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-and-publish function:', error);
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-and-publish' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
