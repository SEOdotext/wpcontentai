import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateImageParams {
  content: string;
  postId: string;
  websiteId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { content, postId, websiteId } = await req.json() as GenerateImageParams;

    if (!content || !postId || !websiteId) {
      throw new Error('Missing required fields');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if AI image generation is enabled for the website
    const { data: website, error: websiteError } = await supabaseClient
      .from('websites')
      .select('enable_ai_image_generation')
      .eq('id', websiteId)
      .single();

    if (websiteError) {
      throw new Error(`Error checking website settings: ${websiteError.message}`);
    }

    if (!website?.enable_ai_image_generation) {
      throw new Error('AI image generation is not enabled for this website');
    }

    // Generate image with DALL-E 3 using direct API call
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `Create a professional, high-quality blog post header image for the following content: ${content}`,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
        style: 'natural',
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    if (!openaiData.data?.[0]?.url) {
      throw new Error('No image URL returned from OpenAI');
    }

    // Download the image
    const imageResponse = await fetch(openaiData.data[0].url);
    const imageBlob = await imageResponse.blob();

    // Upload to Supabase Storage
    const fileName = `${websiteId}/${postId}/header-image.png`;
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('post-images')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Error uploading image: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('post-images')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
}); 