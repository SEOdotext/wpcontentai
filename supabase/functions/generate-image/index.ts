import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

interface GenerateImageParams {
  content: string;
  postId: string;
  websiteId: string;
  imageSettings?: {
    prompt?: string;
    model?: string;
    negativePrompt?: string;
  };
}

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

// Helper to add timeout to fetch requests
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 30000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
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

  // Basic OPTIONS handling without unnecessary CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders
    });
  }

  try {
    // Get the request body
    const { content, postId, websiteId, imageSettings } = await req.json() as GenerateImageParams;

    if (!content || !postId || !websiteId) {
      throw new Error('Missing required fields');
    }

    console.log('Received image generation request:', { 
      postId, 
      websiteId,
      contentLength: content.length 
    });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get website settings to check if AI image generation is enabled
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

    // Get post theme content
    const { data: postTheme, error: postThemeError } = await supabaseClient
      .from('post_themes')
      .select('id, subject_matter, post_content')
      .eq('id', postId)
      .single();
      
    if (postThemeError || !postTheme) {
      throw new Error(`Post theme record not found: ${postThemeError?.message || 'No record with ID ' + postId}`);
    }

    if (!postTheme.subject_matter || !postTheme.post_content) {
      throw new Error('Post theme is missing required content (subject_matter or post_content)');
    }

    // Use the image settings from the request, or fall back to defaults
    const imageModel = imageSettings?.model || 'dalle';
    console.log('Using image model:', imageModel);

    // Get negative prompt if using Stable Diffusion
    const negativePrompt = imageModel === 'stable-diffusion' ? (imageSettings?.negativePrompt || '') : '';
    if (imageModel === 'stable-diffusion' && negativePrompt) {
      console.log('Using negative prompt for Stable Diffusion');
    }

    // Get the prompt template from settings, or use a default
    const promptTemplate = imageSettings?.prompt || 'Create a modern, professional image that represents: {title}. Context: {content}';
    
    // Create the final prompt by replacing placeholders with actual content
    let finalPrompt = promptTemplate
      .replace('{content}', postTheme.post_content)
      .replace('{title}', postTheme.subject_matter);
    
    // Ensure the prompt doesn't exceed the limit
    const MAX_PROMPT_LENGTH = 4000;
    if (finalPrompt.length > MAX_PROMPT_LENGTH) {
      finalPrompt = finalPrompt.substring(0, MAX_PROMPT_LENGTH - 3) + '...';
    }
    
    console.log('Using prompt template:', promptTemplate);
    console.log('Final prompt:', finalPrompt);
    console.log('Prompt length:', finalPrompt.length);

    let imageBlob: Blob;
    let imageFormat = 'image/png'; // Default format

    if (imageModel === 'dalle') {
      // Generate image with DALL-E 3 using OpenAI API
      console.log('Calling OpenAI API for DALL-E image...');
      let openaiResponse;
      try {
        openaiResponse = await fetchWithTimeout(
          'https://api.openai.com/v1/images/generations',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: finalPrompt,
              n: 1,
              size: '1792x1024',
              quality: 'standard',
              style: 'natural',
            }),
          },
          120000 // Increased timeout to 120 seconds for DALL-E 3
        );
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          console.error('OpenAI API request timed out after 120 seconds');
          throw new Error('OpenAI API request timed out after 120 seconds');
        }
        console.error('OpenAI API request failed:', fetchError);
        throw new Error(`OpenAI API request failed: ${fetchError.message}`);
      }

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('OpenAI API error:', errorText);
        
        // Try to parse the error for more helpful messages
        try {
          const errorJson = JSON.parse(errorText);
          const errorMessage = errorJson.error?.message || 'Unknown OpenAI error';
          throw new Error(`OpenAI API error: ${errorMessage}`);
        } catch (parseError) {
          throw new Error(`OpenAI API error: ${errorText}`);
        }
      }

      const openaiData = await openaiResponse.json();
      if (!openaiData.data?.[0]?.url) {
        throw new Error('No image URL returned from OpenAI');
      }

      console.log('Successfully generated image with OpenAI');

      // Download the image
      console.log('Downloading image from OpenAI...');
      let imageResponse;
      try {
        imageResponse = await fetchWithTimeout(
          openaiData.data[0].url,
          {},
          30000 // 30 second timeout for image download
        );
        
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
        }
      } catch (downloadError: any) {
        if (downloadError.name === 'AbortError') {
          throw new Error('Image download timed out after 30 seconds');
        }
        throw new Error(`Image download failed: ${downloadError.message}`);
      }
      
      imageBlob = await imageResponse.blob();
      
    } else {
      // Generate image with Stable Diffusion using Stability AI API
      console.log('Calling Stability AI API for Stable Diffusion image...');
      
      const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY');
      if (!STABILITY_API_KEY) {
        throw new Error('STABILITY_API_KEY is not set in environment variables');
      }
      
      try {
        // Call Stability AI API
        const stabilityResponse = await fetchWithTimeout(
          'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${STABILITY_API_KEY}`,
            },
            body: JSON.stringify({
              text_prompts: [
                {
                  text: finalPrompt,
                  weight: 1
                },
                ...(negativePrompt ? [{
                  text: negativePrompt,
                  weight: -1
                }] : [])
              ],
              cfg_scale: 7,
              height: 1024,
              width: 1024,
              samples: 1,
              steps: 30,
            }),
          },
          90000 // 90 second timeout for Stability API
        );
        
        if (!stabilityResponse.ok) {
          const errorText = await stabilityResponse.text();
          console.error('Stability AI API error:', errorText);
          
          try {
            const errorJson = JSON.parse(errorText);
            const errorMessage = errorJson.message || 'Unknown Stability AI error';
            throw new Error(`Stability AI API error: ${errorMessage}`);
          } catch (parseError) {
            throw new Error(`Stability AI API error: ${errorText}`);
          }
        }
        
        const stabilityData = await stabilityResponse.json();
        
        if (!stabilityData.artifacts || stabilityData.artifacts.length === 0) {
          throw new Error('No image data returned from Stability AI');
        }
        
        console.log('Successfully generated image with Stability AI');
        
        // Convert base64 to Blob
        const base64Image = stabilityData.artifacts[0].base64;
        const byteCharacters = atob(base64Image);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
          const slice = byteCharacters.slice(offset, offset + 1024);
          
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        imageBlob = new Blob(byteArrays, { type: 'image/png' });
        imageFormat = 'image/png';
        
      } catch (stabilityError: any) {
        if (stabilityError.name === 'AbortError') {
          throw new Error('Stability AI API request timed out');
        }
        console.error('Stability AI API request failed:', stabilityError);
        throw new Error(`Stability AI API request failed: ${stabilityError.message}`);
      }
    }
    
    if (!imageBlob || imageBlob.size === 0) {
      throw new Error('Downloaded image is empty or invalid');
    }

    // Upload to Supabase Storage with a simplified path
    console.log('Uploading image to Supabase Storage...');
    
    // Use a simpler file path that's easier to maintain and access
    const timestamp = new Date().getTime();
    const fileName = `${websiteId}/${timestamp}_${postId}_ai_generated.png`;
    
    // First try to delete any existing image to avoid conflicts
    try {
      await supabaseClient
        .storage
        .from('images')
        .remove([fileName]);
      console.log('Removed any existing image');
    } catch (removeError) {
      // Ignore errors from remove operation as the file might not exist
      console.log('No existing image found or error removing');
    }
    
    // Now upload the new image with public access
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('images')
      .upload(fileName, imageBlob, {
        contentType: imageFormat,
        upsert: true,
        public: true // Explicitly set public access
      });

    if (uploadError) {
      throw new Error(`Error uploading image: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('images')
      .getPublicUrl(fileName);
    
    if (!publicUrl) {
      throw new Error('Failed to generate public URL for uploaded image');
    }
    
    console.log('Generated public URL:', publicUrl);
      
    // Insert into images table
    const { data: imageData, error: imageError } = await supabaseClient
      .from('images')
      .insert({
        website_id: websiteId,
        name: `AI Generated Image for ${postTheme.subject_matter}`,
        url: publicUrl,
        size: imageBlob.size,
        type: imageFormat,
        source: 'ai_generated',
        description: `AI generated image for post: ${postTheme.subject_matter}`,
        metadata: {
          postThemeId: postId,
          prompt: finalPrompt,
          model: imageModel
        }
      })
      .select()
      .single();

    if (imageError) {
      throw new Error(`Error inserting into images table: ${imageError.message}`);
    }

    // Update the post_themes table with the image URL
    console.log('Updating post_themes record with image URL...');
    const { data: updateData, error: updateError } = await supabaseClient
      .from('post_themes')
      .update({ 
        image: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Error updating post_themes: ${updateError.message}`);
    }

    if (!updateData || !updateData.image) {
      throw new Error('Update succeeded but image URL was not saved correctly');
    }

    console.log('Successfully updated records with image URL:', {
      postId,
      imageUrl: publicUrl,
      imageId: imageData.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        imageId: imageData.id
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400,
      }
    );
  }
}); 