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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Enhanced logging function to update queue job result
async function logToQueue(supabaseClient: any, postThemeId: string, level: string, message: string, metadata?: any) {
  console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');
  
  try {
    // Find the job in the queue
    const { data: jobs } = await supabaseClient
      .from('publish_queue')
      .select('id, result')
      .eq('post_theme_id', postThemeId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!jobs || jobs.length === 0) {
      console.log('No queue job found for this post theme:', postThemeId);
      return;
    }
    
    const job = jobs[0];
    
    // Create or update logs array in result
    const currentResult = job.result || {};
    const logs = currentResult.logs || [];
    
    // Add new log entry
    logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    });
    
    // Update the result field with the new logs
    const { error } = await supabaseClient
      .from('publish_queue')
      .update({
        result: {
          ...currentResult,
          logs
        }
      })
      .eq('id', job.id);
      
    if (error) {
      console.error('Error updating log in result:', error);
    }
  } catch (error) {
    console.error('Error in logToQueue:', error);
  }
}

/**
 * Waits for image generation to complete by polling the post_themes table
 * @param supabaseClient The Supabase client
 * @param postThemeId The post theme ID
 * @param maxWaitTime Maximum wait time in milliseconds (default: 120000 - 2 minutes)
 * @param interval Polling interval in milliseconds (default: 2000 - 2 seconds)
 * @returns The image URL if found, null otherwise
 */
async function waitForImageGeneration(
  supabaseClient: any,
  postThemeId: string,
  maxWaitTime = 120000,
  interval = 2000
): Promise<string | null> {
  console.log(`Starting to poll for image generation for post ${postThemeId}`);
  console.log(`Max wait time: ${maxWaitTime}ms, Polling interval: ${interval}ms`);
  
  const startTime = Date.now();
  let imageUrl = null;
  
  while (Date.now() - startTime < maxWaitTime) {
    // Check if the image has been generated
    const { data: postTheme, error } = await supabaseClient
      .from('post_themes')
      .select('image')
      .eq('id', postThemeId)
      .single();
    
    if (error) {
      console.error('Error checking image status:', error);
    } else if (postTheme?.image) {
      imageUrl = postTheme.image;
      console.log(`Found image URL after ${Date.now() - startTime}ms:`, imageUrl);
      break;
    }
    
    console.log(`Image not found, waiting ${interval}ms...`);
    // Wait for the specified interval
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  if (!imageUrl) {
    console.log(`Image generation timed out after ${maxWaitTime}ms`);
  }
  
  return imageUrl;
}

/**
 * Fetches the most recent post theme data from the database
 */
async function getPostTheme(supabaseClient: any, postThemeId: string) {
  console.log('Fetching fresh post theme data for ID:', postThemeId);
  
  const { data: postTheme, error } = await supabaseClient
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
  
  if (error) {
    console.error('Error fetching post theme:', error);
    throw new Error(`Failed to fetch post theme data: ${error.message}`);
  }
  
  if (!postTheme) {
    throw new Error(`Post theme not found with ID: ${postThemeId}`);
  }
  
  return postTheme;
}

/**
 * Fetches website settings from the database
 */
async function getWebsiteSettings(supabaseClient: any, websiteId: string) {
  console.log('Fetching website settings for ID:', websiteId);
  
  const { data: website, error } = await supabaseClient
    .from('websites')
    .select('*')
    .eq('id', websiteId)
    .single();
  
  if (error) {
    console.error('Error fetching website settings:', error);
    throw new Error(`Failed to fetch website settings: ${error.message}`);
  }
  
  if (!website) {
    throw new Error(`Website not found with ID: ${websiteId}`);
  }
  
  return website;
}

/**
 * Fetches WordPress settings from the database
 */
async function getWordPressSettings(supabaseClient: any, websiteId: string) {
  console.log('Fetching WordPress settings for website ID:', websiteId);
  
  const { data: wpSettings, error } = await supabaseClient
    .from('wordpress_settings')
    .select('*')
    .eq('website_id', websiteId)
    .single();
  
  if (error) {
    console.error('Error fetching WordPress settings:', error);
    throw new Error(`Failed to fetch WordPress settings: ${error.message}`);
  }
  
  if (!wpSettings) {
    throw new Error(`WordPress settings not found for website ID: ${websiteId}`);
  }
  
  return wpSettings;
}

/**
 * Generates content for a post
 */
async function generateContent(postThemeId: string, token: string) {
  console.log('Generating content for post:', postThemeId);
  
  // Use the service role key instead of user token
  const contentResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-content-v3', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'X-Queue-Processing': 'true',
      'X-Original-User-Token': token // Pass the original token for reference if needed
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
    contentLength: contentResult.content?.length || 0
  });
  
  return contentResult;
}

/**
 * Triggers image generation and waits for it to complete
 */
async function triggerAndWaitForImage(supabaseClient: any, postThemeId: string, websiteId: string, token: string) {
  console.log('Triggering image generation for post:', postThemeId);
  
  try {
    // First check if image already exists
    const { data: existingImage } = await supabaseClient
      .from('post_themes')
      .select('image')
      .eq('id', postThemeId)
      .single();
    
    if (existingImage?.image) {
      console.log('Image already exists:', existingImage.image);
      return existingImage.image;
    }
    
    console.log('No existing image found, starting generation process');
    
    // Trigger image generation
    const imageResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/image-trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        postId: postThemeId,
        websiteId: websiteId
      })
    });
    
    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('Image generation failed:', {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        error: errorText
      });
      return null;
    }
    
    const imageResult = await imageResponse.json();
    console.log('Image trigger response:', imageResult);
    
    if (imageResult.imageUrl) {
      // Image was generated immediately
      console.log('Image generated immediately:', imageResult.imageUrl);
      return imageResult.imageUrl;
    } else if (imageResult.success && imageResult.isGenerating) {
      console.log('Image generation started, waiting for completion...');
      
      // Wait for the image to be generated by polling the post_themes table
      const imageUrl = await waitForImageGeneration(supabaseClient, postThemeId);
      
      if (imageUrl) {
        console.log('Image generation completed successfully:', imageUrl);
        return imageUrl;
      } else {
        console.log('Image generation timed out, proceeding without image');
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in image generation process:', error);
    return null;
  }
}

/**
 * Sends a post to WordPress
 */
async function sendToWordPress(postThemeId: string, websiteId: string, token: string, isQueueProcessing: boolean = false) {
  console.log('Sending post to WordPress:', postThemeId);
  
  // For queue processing, use the service role key for WordPress publishing
  const authToken = isQueueProcessing 
    ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') 
    : token;
  
  console.log('Using token type for WordPress:', {
    isQueueProcessing,
    usingServiceRole: isQueueProcessing,
    tokenLength: authToken ? authToken.length : 0
  });
  
  // Add system auth header for queue processing
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
  
  // If using service role key, add a system auth header
  if (isQueueProcessing) {
    headers['X-System-Auth'] = 'true';
  }
  
  const wpResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/wordpress-posts', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      post_theme_id: postThemeId,
      action: 'create',
      status: 'draft', // Will be overridden by WordPress settings
      website_id: websiteId
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
  
  return wpResult;
}

/**
 * Updates the post theme with the WordPress publishing results
 */
async function updatePostThemeWithResults(
  supabaseClient: any, 
  postThemeId: string, 
  wpResult: any, 
  imageUrl: string | null
) {
  console.log('Updating post theme with results:', {
    postThemeId,
    wpPostId: wpResult.post.id,
    hasImage: !!imageUrl
  });
  
  const { error: updateError } = await supabaseClient
    .from('post_themes')
    .update({
      status: 'published',
      wp_sent_date: new Date().toISOString(),
      wp_post_id: wpResult.post.id,
      wp_post_url: wpResult.post.link,
      wp_image_url: imageUrl
    })
    .eq('id', postThemeId);
  
  if (updateError) {
    console.error('Error updating post theme with results:', updateError);
  } else {
    console.log('Successfully updated post theme with WordPress details');
  }
  
  return !updateError;
}

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

    // Check if this is a direct call or a queue processing call
    const isQueueProcessing = req.headers.get('X-Queue-Processing') === 'true';
    
    if (!isQueueProcessing) {
      // Add job to queue
      console.log('Adding job to publish queue...');
      const { data: queueJob, error: queueError } = await supabaseClient
        .from('publish_queue')
        .insert({
          post_theme_id: postThemeId,
          status: 'pending',
          created_at: new Date().toISOString(),
          user_token: token
        })
        .select()
        .single();

      if (queueError) {
        console.error('Error adding job to queue:', queueError);
        throw new Error(`Failed to add job to queue: ${queueError.message}`);
      }

      // Trigger queue processing
      console.log('Triggering queue processing...');
      const queueResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/process-publish-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        }
      });

      if (!queueResponse.ok) {
        console.error('Error triggering queue processing:', await queueResponse.text());
      }

      // Log job creation
      await logToQueue(supabaseClient, postThemeId, 'info', 'Job added to publish queue', {
        function: 'generate-and-publish',
        isQueueProcessing: false
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Job added to queue',
          queueJob
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== QUEUE PROCESSING LOGIC =====
    // This section runs when processing a job from the queue
    
    console.log('Starting processing for post theme ID:', postThemeId);
    await logToQueue(supabaseClient, postThemeId, 'info', 'Starting content generation and publishing', {
      function: 'generate-and-publish',
      isQueueProcessing: true
    });
    
    // Step 1: Fetch the most recent post theme data
    const postTheme = await getPostTheme(supabaseClient, postThemeId);
    await logToQueue(supabaseClient, postThemeId, 'info', 'Retrieved post theme data', {
      hasContent: !!postTheme.post_content,
      hasImage: !!postTheme.image
    });
    
    // Step 2: Fetch website settings
    const website = await getWebsiteSettings(supabaseClient, postTheme.website_id);
    
    // Step 3: Fetch WordPress settings
    const wpSettings = await getWordPressSettings(supabaseClient, postTheme.website_id);
    console.log('WordPress settings retrieved:', {
      url: wpSettings.wp_url,
      hasCredentials: !!wpSettings.wp_username && !!wpSettings.wp_application_password,
      publishStatus: wpSettings.publish_status || 'draft'
    });
    
    // Step 4: Generate content if not already generated
    if (!postTheme.post_content) {
      console.log('No content found - generating content first');
      await generateContent(postThemeId, token);
      
      // Re-fetch post theme to get the updated content
      const contentUpdatedTheme = await getPostTheme(supabaseClient, postThemeId);
      
      if (!contentUpdatedTheme.post_content) {
        throw new Error('Content generation completed but no content was found in the database');
      }
      
      console.log('Content generated successfully, content length:', contentUpdatedTheme.post_content.length);
      
      // Add to image generation queue if enabled
      if (website.enable_ai_image_generation) {
        console.log('Adding to image generation queue:', {
          postThemeId,
          websiteId: website.id
        });
        
        const { data: queueJob, error: queueError } = await supabaseClient
          .from('image_generation_queue')
          .insert({
            post_theme_id: postThemeId,
            website_id: website.id,
            status: 'pending',
            user_token: token
          })
          .select()
          .single();
        
        if (queueError) {
          console.error('Failed to add to image generation queue:', queueError);
        } else {
          console.log('Successfully added to image generation queue:', {
            jobId: queueJob.id,
            status: queueJob.status
          });
          
          // Trigger the queue processor
          const processorResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/process-image-queue', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!processorResponse.ok) {
            console.error('Failed to trigger image queue processor:', await processorResponse.text());
          } else {
            console.log('Image queue processor triggered successfully');
          }
        }
      }
    } else {
      console.log('Using existing content, length:', postTheme.post_content.length);
    }
    
    // Step 5: Wait for image generation to complete
    let imageUrl = postTheme.image;
    console.log('Initial image check:', {
      postThemeId,
      hasExistingImage: !!imageUrl,
      existingImageUrl: imageUrl || 'none'
    });
    
    if (!imageUrl && website.enable_ai_image_generation) {
      console.log('Waiting for image generation to complete...');
      
      // Poll both the queue and post_themes table for status
      const maxAttempts = 60; // 60 attempts * 2 second delay = 120 seconds max wait
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        // First check post_themes table directly
        const { data: postTheme, error: postError } = await supabaseClient
          .from('post_themes')
          .select('image')
          .eq('id', postThemeId)
          .single();
        
        if (!postError && postTheme?.image) {
          imageUrl = postTheme.image;
          console.log('Found image URL in post_themes:', imageUrl);
          break;
        }
        
        // If not found in post_themes, check the queue
        const { data: queueStatus, error: statusError } = await supabaseClient
          .from('image_generation_queue')
          .select('status, image_url, error')
          .eq('post_theme_id', postThemeId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (statusError) {
          console.error('Error checking image queue status:', statusError);
          break;
        }
        
        console.log('Image generation status:', {
          postThemeId,
          status: queueStatus.status,
          imageUrl: queueStatus.image_url || 'none',
          attempt: attempts + 1
        });
        
        if (queueStatus.status === 'completed' && queueStatus.image_url) {
          imageUrl = queueStatus.image_url;
          break;
        }
        
        if (queueStatus.status === 'failed') {
          console.error('Image generation failed:', queueStatus.error);
          throw new Error('Image generation failed: ' + (queueStatus.error || 'Unknown error'));
        }
        
        // Wait 2 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
      
      if (!imageUrl) {
        throw new Error('Image generation timed out after 120 seconds');
      }
    }
    
    // Step 6: Re-fetch the post theme to ensure we have the latest data
    const updatedPostTheme = await getPostTheme(supabaseClient, postThemeId);
    console.log('Final post theme data before WordPress publishing:', {
      postThemeId,
      hasContent: !!updatedPostTheme.post_content,
      contentLength: updatedPostTheme.post_content?.length || 0,
      hasImage: !!updatedPostTheme.image,
      imageUrl: updatedPostTheme.image || 'none'
    });
    
    // Step 7: Send to WordPress
    console.log('Sending to WordPress with final data:', {
      postThemeId,
      hasImage: !!updatedPostTheme.image,
      imageUrl: updatedPostTheme.image || 'none',
      contentLength: updatedPostTheme.post_content?.length || 0
    });
    
    // Log the exact image URL being sent
    console.log('Image URL being sent to WordPress:', {
      postThemeId,
      imageUrl: updatedPostTheme.image,
      isNull: updatedPostTheme.image === null,
      isUndefined: updatedPostTheme.image === undefined,
      isEmpty: updatedPostTheme.image === ''
    });
    
    const wpResult = await sendToWordPress(postThemeId, updatedPostTheme.website_id, token, isQueueProcessing);
    
    // Step 8: Update post theme with WordPress results
    await updatePostThemeWithResults(supabaseClient, postThemeId, wpResult, updatedPostTheme.image);
    
    // Return the successful response
    return new Response(
      JSON.stringify({
        success: true,
        post: wpResult.post
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-and-publish function:', error);
    
    // Log the error before responding
    try {
      // Use the postThemeId from the request if available
      const requestBody = await req.json().catch(() => ({}));
      const currentPostThemeId = requestBody.postThemeId;
      
      if (currentPostThemeId) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await logToQueue(supabaseClient, currentPostThemeId, 'error', 'Function failed', {
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
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
