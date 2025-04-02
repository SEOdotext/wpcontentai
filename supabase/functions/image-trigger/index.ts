import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Get allowed origins from environment variables
const ALLOWED_ORIGINS = {
  production: Deno.env.get('ALLOWED_ORIGINS_PROD')?.split(',') || ['https://contentgardener.ai'],
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

interface TriggerRequest {
  postId: string;
  websiteId: string;
  forceRegenerate?: boolean;
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

    // Start async image generation process
    generateImageAsync(postId, websiteId, postTheme, supabaseClient).catch(error => {
      console.error('Error in async image generation:', error);
      // Update post theme with error status
      supabaseClient
        .from('post_themes')
        .update({ 
          image_generation_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .then(() => console.log('Updated post theme with error status'))
        .catch(e => console.error('Error updating post theme with error:', e));
    });

    // Return immediately to indicate the process has started
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Image generation started',
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

// Async function to handle the actual image generation
async function generateImageAsync(
  postId: string,
  websiteId: string,
  postTheme: any,
  supabaseClient: any
) {
  try {
    console.log('Starting image generation for post:', postId);
    
    // Call the generate-image Edge function instead of implementing image generation directly
    const edgeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-image`;
    console.log('Calling generate-image Edge function:', edgeUrl);
    
    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        content: postTheme.post_content,
        postId: postId,
        websiteId: websiteId
      }),
    });
    
    if (!response.ok) {
      let errorMessage = `Edge function error: ${response.status} ${response.statusText}`;
      let errorData;
      
      try {
        errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Fallback to the status error if JSON parsing fails
        try {
          // Try getting the error as text
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (textError) {
          // If that also fails, stick with the status error
        }
      }
      
      // Check for content policy violation
      const isPolicyViolation = errorMessage.includes('content_policy_violation') || 
                                errorMessage.includes('safety system') ||
                                errorMessage.includes('not allowed by our safety system');
      
      if (isPolicyViolation) {
        console.error('Content policy violation detected:', errorMessage);
        
        // Update both database tables to mark this as a failed policy job
        const errorSummary = 'Image generation failed due to content policy violation';
        
        // Update post_themes table
        await supabaseClient
          .from('post_themes')
          .update({ 
            image_generation_error: errorSummary,
            updated_at: new Date().toISOString()
          })
          .eq('id', postId);
        
        // Check if this came from a queue job and update it
        const { data: queueJobs } = await supabaseClient
          .from('image_generation_queue')
          .select('id')
          .eq('post_theme_id', postId)
          .eq('status', 'processing')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (queueJobs && queueJobs.length > 0) {
          await supabaseClient
            .from('image_generation_queue')
            .update({
              status: 'failed',
              error: errorSummary,
              completed_at: new Date().toISOString(),
              result: {
                error: errorMessage,
                policyViolation: true
              }
            })
            .eq('id', queueJobs[0].id);
        }
        
        // Throw error to stop processing
        throw new Error(errorSummary);
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.imageUrl) {
      throw new Error('Image generation failed: ' + (data.error || 'No image URL returned'));
    }
    
    console.log('Successfully completed async image generation for post:', postId, data.imageUrl);
    return data.imageUrl;
    
  } catch (error) {
    console.error('Error in generateImageAsync:', error);
    throw error;
  }
}

// Function to create a safe prompt is no longer needed as it's handled by the generate-image function
// function createSafePrompt(title: string, content: string): string {
//   ...
// } 