// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

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
    const { postThemeId } = await req.json();
    const authHeader = req.headers.get('Authorization');
    console.log('Received request for postThemeId:', postThemeId);

    if (!postThemeId) {
      throw new Error('Missing required field: postThemeId');
    }

    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Extract the token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    console.log('Using auth token for internal function calls');

    // Validate postThemeId format (should be a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(postThemeId)) {
      throw new Error(`Invalid postThemeId format. Expected UUID, got: ${postThemeId}`);
    }

    // Get the post theme details from the database
    console.log('Fetching post theme from database...');
    console.log('Using Supabase URL:', Deno.env.get('SUPABASE_URL'));
    console.log('Post theme ID being queried:', postThemeId);
    
    // First check if the post theme exists
    console.log('Executing existence check query...');
    const { count, error: countError } = await supabaseClient
      .from('post_themes')
      .select('id', { count: 'exact', head: true })
      .eq('id', postThemeId);

    if (countError) {
      console.error('Error checking post theme existence:', countError);
      console.error('Error details:', {
        code: countError.code,
        message: countError.message,
        details: countError.details,
        hint: countError.hint
      });
      throw new Error(`Failed to check post theme existence: ${countError.message}`);
    }

    console.log('Post theme count:', count);

    if (count === 0) {
      console.log('No post theme found with ID:', postThemeId);
      throw new Error(`Post theme not found with ID: ${postThemeId}`);
    }

    // Now fetch the actual post theme with all required fields
    console.log('Executing full post theme query...');
    const { data: postTheme, error: postThemeError } = await supabaseClient
      .from('post_themes')
      .select(`
        id,
        website_id,
        subject_matter,
        keywords,
        status,
        scheduled_date,
        post_content,
        image,
        wp_post_id,
        wp_post_url,
        wp_sent_date,
        wp_image_url
      `)
      .eq('id', postThemeId)
      .single();

    if (postThemeError) {
      console.error('Database error fetching post theme:', postThemeError);
      console.error('Error details:', {
        code: postThemeError.code,
        message: postThemeError.message,
        details: postThemeError.details,
        hint: postThemeError.hint
      });
      throw new Error(`Failed to fetch post theme from database: ${postThemeError.message}`);
    }

    if (!postTheme) {
      console.log('No post theme data returned from full query');
      throw new Error(`Post theme not found with ID: ${postThemeId}`);
    }

    console.log('Successfully fetched post theme:', {
      id: postTheme.id,
      website_id: postTheme.website_id,
      status: postTheme.status,
      subject_matter: postTheme.subject_matter,
      has_content: !!postTheme.post_content,
      has_image: !!postTheme.image
    });

    // Get website settings
    console.log('Fetching website settings...');
    const { data: website, error: websiteError } = await supabaseClient
      .from('websites')
      .select('*')
      .eq('id', postTheme.website_id)
      .single();

    if (websiteError) {
      console.error('Database error fetching website:', websiteError);
      throw new Error(`Failed to fetch website settings: ${websiteError.message}`);
    }

    if (!website) {
      throw new Error(`Website not found with ID: ${postTheme.website_id}`);
    }

    // Get WordPress settings
    console.log('Fetching WordPress settings...');
    const { data: wpSettings, error: wpError } = await supabaseClient
      .from('wordpress_settings')
      .select('*')
      .eq('website_id', postTheme.website_id)
      .single();

    if (wpError) {
      console.error('Database error fetching WordPress settings:', wpError);
      throw new Error(`Failed to fetch WordPress settings: ${wpError.message}`);
    }

    if (!wpSettings) {
      throw new Error(`WordPress settings not found for website ID: ${postTheme.website_id}`);
    }

    // Step 1: Generate content
    console.log('Generating content for post:', postThemeId);
    const contentResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-content-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ postThemeId })
    });

    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      console.error('Content generation failed:', {
        status: contentResponse.status,
        statusText: contentResponse.statusText,
        error: errorText
      });
      throw new Error(`Failed to generate content: ${contentResponse.status} ${contentResponse.statusText}`);
    }

    const contentResult = await contentResponse.json();
    console.log('Content generation successful:', {
      postThemeId,
      hasContent: !!contentResult.content,
      contentLength: contentResult.content?.length
    });

    // Step 2: Generate image if enabled
    let imageUrl = null;
    if (website.enable_ai_image_generation) {
      console.log('Generating image for post:', postThemeId);
      const imageResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
    console.log('WordPress settings:', {
      wp_url: wpSettings.wp_url,
      has_username: !!wpSettings.wp_username,
      has_password: !!wpSettings.wp_application_password,
      publish_status: wpSettings.publish_status
    });

    const wpResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/wordpress-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        post_theme_id: postThemeId,
        action: 'create',
        status: wpSettings.publish_status || 'draft',
        website_id: postTheme.website_id
      })
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error('WordPress publishing failed:', {
        status: wpResponse.status,
        statusText: wpResponse.statusText,
        error: errorText
      });
      throw new Error(`Failed to send post to WordPress: ${wpResponse.status} ${wpResponse.statusText}`);
    }

    const wpResult = await wpResponse.json();
    console.log('WordPress publishing successful:', {
      postId: wpResult.post?.id,
      postUrl: wpResult.post?.link,
      status: wpResult.post?.status
    });

    // Update post theme with final status
    console.log('Updating post theme with WordPress details...');
    const { error: updateError } = await supabaseClient
      .from('post_themes')
      .update({
        status: 'published',
        wp_sent_date: new Date().toISOString(),
        wp_post_id: wpResult.post.id,
        wp_post_url: wpResult.post.link,
        wp_image_url: imageUrl // Add the generated image URL if available
      })
      .eq('id', postThemeId);

    if (updateError) {
      console.error('Error updating post theme:', updateError);
      console.error('Error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      // Don't throw here, as the post was successfully published to WordPress
    } else {
      console.log('Successfully updated post theme with WordPress details');
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
