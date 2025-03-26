import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TriggerRequest {
  postId: string;
  websiteId: string;
  forceRegenerate?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the request body with minimal data needed
    const { postId, websiteId, forceRegenerate = false } = await req.json() as TriggerRequest;

    if (!postId || !websiteId) {
      throw new Error('Missing required fields: postId and websiteId are required');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if AI image generation is enabled for the website
    const { data: website, error: websiteError } = await supabaseClient
      .from('websites')
      .select('enable_ai_image_generation, image_prompt')
      .eq('id', websiteId)
      .single();

    if (websiteError) {
      throw new Error(`Error checking website settings: ${websiteError.message}`);
    }

    if (!website?.enable_ai_image_generation) {
      throw new Error('AI image generation is not enabled for this website');
    }

    // Get post content from the database to perform image generation
    const { data: postTheme, error: postThemeError } = await supabaseClient
      .from('post_themes')
      .select('id, subject_matter, post_content, image')
      .eq('id', postId)
      .single();
      
    if (postThemeError || !postTheme) {
      throw new Error(`Post theme not found: ${postThemeError?.message || 'No post with ID ' + postId}`);
    }

    if (!postTheme.post_content) {
      throw new Error('Cannot generate image: Post has no content');
    }

    // Check if image already exists and return if it does (unless forceRegenerate is true)
    if (postTheme.image && !forceRegenerate) {
      console.log('Image already exists for this post, returning existing URL:', postTheme.image);
      return new Response(
        JSON.stringify({
          success: true,
          imageUrl: postTheme.image,
          message: 'Using existing image',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check for custom image prompt in publication_settings
    const { data: pubSettings, error: pubSettingsError } = await supabaseClient
      .from('publication_settings')
      .select('image_prompt')
      .eq('website_id', websiteId)
      .maybeSingle();

    // Determine which image prompt to use
    let customPrompt = null;
    if (!pubSettingsError && pubSettings?.image_prompt) {
      customPrompt = pubSettings.image_prompt;
      console.log('Using image prompt from publication_settings:', customPrompt);
    } else if (website.image_prompt) {
      customPrompt = website.image_prompt;
      console.log('Using image prompt from website settings:', customPrompt);
    } else {
      console.log('No custom prompt found, will use default prompt template');
    }

    // Now we have the post content, pass it to the image generation process
    // This keeps all the complex operations on the backend
    console.log('Generating image for post:', {
      postId,
      title: postTheme.subject_matter,
      contentLength: postTheme.post_content.length
    });

    // Generate a prompt using the custom template if available
    let prompt;
    if (customPrompt) {
      console.log('Before token replacement, custom prompt is:', customPrompt);
      prompt = customPrompt
        .replace('{title}', postTheme.subject_matter)
        .replace('{content}', postTheme.post_content.substring(0, 1000)); // Limit content length
      console.log('After token replacement, final prompt is:', prompt.substring(0, 100) + '...');
    } else {
      // Fallback to default prompt format
      prompt = createSafePrompt(postTheme.subject_matter, postTheme.post_content);
      console.log('Using default prompt template:', prompt.substring(0, 100) + '...');
    }

    // Call OpenAI to generate the image
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
        style: 'natural',
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    if (!openaiData.data?.[0]?.url) {
      throw new Error('No image URL returned from OpenAI');
    }

    // Download the image
    const imageResponse = await fetch(openaiData.data[0].url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    
    const imageBlob = await imageResponse.blob();

    // Upload to Supabase Storage
    const fileName = `${postId}-header.png`;
    
    // Try to remove any existing image first
    try {
      await supabaseClient.storage.from('post-images').remove([fileName]);
      console.log('Removed any existing image');
    } catch (e) {
      // Ignore removal errors
    }
    
    // Upload the new image with public access
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('post-images')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: true,
        public: true
      });

    if (uploadError) {
      throw new Error(`Error uploading image: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('post-images')
      .getPublicUrl(fileName);
    
    if (!publicUrl) {
      throw new Error('Failed to generate public URL for uploaded image');
    }
    
    console.log('Generated public URL:', publicUrl);
      
    // Update the post_themes table with the image URL
    const { error: updateError } = await supabaseClient
      .from('post_themes')
      .update({ 
        image: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      throw new Error(`Error updating post_themes: ${updateError.message}`);
    }

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
    console.error('Error in image-trigger function:', error);
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

// Function to create a safe prompt that won't exceed OpenAI's limits
function createSafePrompt(title: string, content: string): string {
  // Create a shortened summary - limit to safe character count
  // OpenAI limit is 4000, but we'll use much less to be safe
  const MAX_PROMPT_LENGTH = 1500;
  
  // Start with the title
  let safeContent = title.substring(0, Math.min(100, title.length));
  
  // Add as much of the content as we can fit
  const remainingSpace = MAX_PROMPT_LENGTH - safeContent.length - 100; // 100 chars buffer for prefix
  if (remainingSpace > 0) {
    // Add a brief excerpt from the content, avoiding cutting in the middle of words
    let excerpt = content.substring(0, remainingSpace);
    
    // Try to end at a sentence or paragraph break if possible
    const sentenceBreak = excerpt.lastIndexOf('.');
    const paragraphBreak = excerpt.lastIndexOf('\n');
    
    let breakPoint = Math.max(sentenceBreak, paragraphBreak);
    if (breakPoint > excerpt.length / 2) {
      excerpt = excerpt.substring(0, breakPoint + 1);
    }
    
    safeContent += ' ' + excerpt.trim();
  }
  
  return `Create a professional, high-quality blog post header image for: ${safeContent}`;
} 