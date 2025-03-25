import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../types/supabase';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const { content, postId, websiteId } = await context.request.json();

    if (!content || !postId || !websiteId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabase = createClient<Database>(
      context.env.SUPABASE_URL,
      context.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if website has AI image generation enabled
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('enable_ai_image_generation')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website?.enable_ai_image_generation) {
      return new Response(
        JSON.stringify({ error: 'AI image generation is not enabled for this website' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate image using OpenAI
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `Create a professional and engaging blog post header image for the following content: ${content.substring(0, 1000)}`,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate image');
    }

    const imageData = await response.json();
    const imageUrl = imageData.data[0].url;

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `posts/${postId}/header-image.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName);

    // Update the post with the image URL
    const { error: updateError } = await supabase
      .from('posts')
      .update({ preview_image_url: publicUrl })
      .eq('id', postId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate image' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};