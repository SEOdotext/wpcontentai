// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-system-auth, x-queue-processing',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Status checks array for logging
interface StatusCheck {
  timestamp: string;
  attempt: number;
  status: string;
  error?: string;
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
  const statusChecks: StatusCheck[] = [];
  
  while (Date.now() - startTime < maxWaitTime) {
    // Check if the image has been generated
    const { data: postTheme, error } = await supabaseClient
      .from('post_themes')
      .select('image')
      .eq('id', postThemeId)
      .single();
    
    const currentAttempt = Math.floor((Date.now() - startTime) / interval) + 1;
    
    if (error) {
      console.error('Error checking image status:', error);
      statusChecks.push({
        timestamp: new Date().toISOString(),
        attempt: currentAttempt,
        status: 'error',
        error: error.message
      });
    } else if (postTheme?.image) {
      imageUrl = postTheme.image;
      console.log(`Found image URL after ${Date.now() - startTime}ms:`, imageUrl);
      statusChecks.push({
        timestamp: new Date().toISOString(),
        attempt: currentAttempt,
        status: 'success',
      });
      break;
    } else {
      statusChecks.push({
        timestamp: new Date().toISOString(),
        attempt: currentAttempt,
        status: 'waiting',
      });
      console.log(`Image not found, waiting ${interval}ms...`);
    }
    
    // Wait for the specified interval
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  if (!imageUrl) {
    console.log(`Image generation timed out after ${maxWaitTime}ms`);
    statusChecks.push({
      timestamp: new Date().toISOString(),
      attempt: Math.floor((Date.now() - startTime) / interval) + 1,
      status: 'timeout',
      error: `Image generation timed out after ${maxWaitTime}ms`
    });
  }
  
  // Return the status checks for logging purposes
  console.log('Image generation status checks:', JSON.stringify(statusChecks));
  
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
  
  const contentResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-content-v3', {
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
    contentLength: contentResult.content?.length || 0
  });
  
  return contentResult;
}

/**
 * Sends a post to WordPress
 */
async function sendToWordPress(postThemeId: string, websiteId: string, token: string) {
  console.log('Sending post to WordPress:', postThemeId);
  
  const wpResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/wordpress-posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
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

/**
 * Updates the queue job status with detailed progress information
 */
async function updateQueueJobStatus(
  supabaseClient: any,
  queueJobId: string,
  status: string,
  details: any = null
) {
  console.log(`Updating queue job status: ${queueJobId} -> ${status}`, details ? 'with details' : 'without details');
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };
  
  if (details) {
    updateData.result = details;
  }
  
  const { error } = await supabaseClient
    .from('publish_queue')
    .update(updateData)
    .eq('id', queueJobId);
  
  if (error) {
    console.error('Error updating queue job status:', error);
  } else {
    console.log(`Successfully updated queue job status to ${status}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[generate-and-publish] Function invoked', { 
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Create Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the request body and authorization header
    const requestBody = await req.json();
    const { postThemeId } = requestBody;
    const authHeader = req.headers.get('Authorization');
    const systemAuthHeader = req.headers.get('X-System-Auth');
    
    console.log('[generate-and-publish] Request details', { 
      postThemeId,
      hasAuthHeader: !!authHeader, 
      systemAuth: systemAuthHeader,
      body: JSON.stringify(requestBody)
    });
    
    // Add prominent logging for the postThemeId
    console.log('==================================');
    console.log(`PROCESSING POST THEME ID: ${postThemeId}`);
    console.log('==================================');

    if (!postThemeId) {
      throw new Error('Missing required field: postThemeId');
    }

    // For system calls with X-System-Auth true, we bypass token validation
    const isSystemAuth = systemAuthHeader === 'true';
    if (!isSystemAuth && !authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Extract the token from the Authorization header if needed for function calls
    // System auth will use the service role key instead
    const token = isSystemAuth ? 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '' : 
      (authHeader ? authHeader.replace('Bearer ', '') : '');
    console.log('Using auth type:', isSystemAuth ? 'system' : 'user');

    // Validate postThemeId format (should be a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(postThemeId)) {
      throw new Error(`Invalid postThemeId format. Expected UUID, got: ${postThemeId}`);
    }

    // Check if this is a direct call or a queue processing call
    const isQueueProcessing = req.headers.get('X-Queue-Processing') === 'true';
    
    if (!isQueueProcessing) {
      // Add job to publish queue
      console.log('[generate-and-publish] Adding job to publish queue...', { postThemeId, token: token ? 'token-present' : 'no-token' });
      const { data: queueJob, error: queueError } = await supabaseClient
        .from('publish_queue')
        .insert({
          post_theme_id: postThemeId,
          status: 'pending',
          created_at: new Date().toISOString(),
          user_token: token,
          result: { 
            log: [`Job created at ${new Date().toISOString()}`],
            postThemeId
          }
        })
        .select()
        .single();

      if (queueError) {
        console.error('[generate-and-publish] Error adding job to queue:', queueError);
        throw new Error(`Failed to add job to queue: ${queueError.message}`);
      }

      console.log('[generate-and-publish] Job successfully added to queue:', { 
        queueJobId: queueJob.id,
        status: queueJob.status
      });

      // Trigger queue processing
      console.log('[generate-and-publish] Triggering queue processing...');
      const queueResponse = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/process-publish-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        }
      });

      if (!queueResponse.ok) {
        const responseText = await queueResponse.text();
        console.error('[generate-and-publish] Error triggering queue processing:', {
          status: queueResponse.status,
          statusText: queueResponse.statusText,
          responseText
        });
      } else {
        console.log('[generate-and-publish] Queue processing triggered successfully');
      }

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
    
    // Get the job record first
    const { data: queueJob, error: fetchJobError } = await supabaseClient
      .from('publish_queue')
      .select('*')
      .eq('post_theme_id', postThemeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchJobError) {
      console.error('Error fetching queue job:', fetchJobError);
      throw new Error(`Failed to fetch queue job: ${fetchJobError.message}`);
    }

    const queueJobId = queueJob.id;
    console.log(`Processing queue job: ${queueJobId} for post theme: ${postThemeId}`);

    // Update status to processing
    await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
      log: [`Started processing at ${new Date().toISOString()}`],
      postThemeId,
      progress: 0
    });

    console.log('Starting processing for post theme ID:', postThemeId);
    
    try {
      // Step 1: Fetch the most recent post theme data
      const postTheme = await getPostTheme(supabaseClient, postThemeId);
      console.log('Retrieved post theme:', {
        id: postTheme.id,
        subject: postTheme.subject_matter,
        hasContent: !!postTheme.post_content,
        hasImage: !!postTheme.image,
        status: postTheme.status
      });
      
      await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
        log: [`Retrieved post theme data at ${new Date().toISOString()}`],
        postThemeId,
        progress: 10,
        postThemeStatus: postTheme.status
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
      
      await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
        log: [`Retrieved website and WordPress settings at ${new Date().toISOString()}`],
        postThemeId,
        progress: 20,
        websiteId: website.id,
        wpUrl: wpSettings.wp_url
      });
      
      // Step 4: Generate content if needed based on post status
      if (!postTheme.post_content && postTheme.status === 'approved') {
        console.log('No content found - generating content first');
        
        await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
          log: [`Starting content generation at ${new Date().toISOString()}`],
          postThemeId,
          progress: 30,
          step: 'content_generation'
        });
        
        await generateContent(postThemeId, token);
        
        // Re-fetch post theme to get the updated content
        const contentUpdatedTheme = await getPostTheme(supabaseClient, postThemeId);
        
        if (!contentUpdatedTheme.post_content) {
          throw new Error('Content generation completed but no content was found in the database');
        }
        
        console.log('Content generated successfully, content length:', contentUpdatedTheme.post_content.length);
        
        // Update status to textgenerated
        await supabaseClient
          .from('post_themes')
          .update({ status: 'textgenerated' })
          .eq('id', postThemeId);
        
        await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
          log: [`Content generated successfully at ${new Date().toISOString()}`],
          postThemeId,
          progress: 40,
          contentLength: contentUpdatedTheme.post_content.length
        });
      } else {
        console.log(postTheme.post_content ? 
          `Using existing content, length: ${postTheme.post_content.length}` :
          `No content found but post status is ${postTheme.status} - skipping content generation`);
        
        await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
          log: [`Using existing content at ${new Date().toISOString()}`],
          postThemeId,
          progress: 40,
          contentExists: !!postTheme.post_content,
          contentLength: postTheme.post_content?.length || 0
        });
      }
      
      // Step 5: Generate image if needed
      let imageUrl = postTheme.image;
      console.log('Initial image check:', {
        postThemeId,
        hasExistingImage: !!imageUrl,
        existingImageUrl: imageUrl || 'none',
        postStatus: postTheme.status
      });
      
      // Only generate image for 'approved' or 'textgenerated' status
      if (!imageUrl && website.enable_ai_image_generation && 
          (postTheme.status === 'approved' || postTheme.status === 'textgenerated')) {
        console.log('Adding to image generation queue:', {
          postThemeId,
          websiteId: website.id,
          postStatus: postTheme.status
        });
        
        await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
          log: [`Starting image generation at ${new Date().toISOString()}`],
          postThemeId,
          progress: 50,
          step: 'image_generation'
        });
        
        const { data: imageQueueJob, error: queueError } = await supabaseClient
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
          
          await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
            log: [`Failed to add to image generation queue at ${new Date().toISOString()}: ${queueError.message}`],
            postThemeId,
            progress: 50,
            error: queueError.message
          });
        } else {
          console.log('Successfully added to image generation queue:', {
            jobId: imageQueueJob.id,
            status: imageQueueJob.status
          });
          
          await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
            log: [`Added to image generation queue at ${new Date().toISOString()}: ${imageQueueJob.id}`],
            postThemeId,
            progress: 55,
            imageQueueJobId: imageQueueJob.id
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
            const errorText = await processorResponse.text();
            console.error('Failed to trigger image queue processor:', errorText);
            
            await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
              log: [`Failed to trigger image queue processor at ${new Date().toISOString()}: ${errorText}`],
              postThemeId,
              progress: 55,
              error: errorText
            });
          } else {
            console.log('Image queue processor triggered successfully');
            
            await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
              log: [`Image queue processor triggered at ${new Date().toISOString()}`],
              postThemeId,
              progress: 60
            });
          }
          
          // Wait for image generation
          console.log('Waiting for image generation to complete...');
          
          await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
            log: [`Waiting for image generation to complete at ${new Date().toISOString()}`],
            postThemeId,
            progress: 65,
            step: 'waiting_for_image'
          });
          
          imageUrl = await waitForImageGeneration(supabaseClient, postThemeId);
          
          if (!imageUrl) {
            const errorMessage = 'Image generation timed out after 120 seconds';
            console.error(errorMessage);
            
            await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
              log: [`Image generation timed out at ${new Date().toISOString()}`],
              postThemeId,
              progress: 65,
              error: errorMessage
            });
            
            throw new Error(errorMessage);
          } else {
            // Update status to generated
            await supabaseClient
              .from('post_themes')
              .update({ status: 'generated' })
              .eq('id', postThemeId);
            
            await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
              log: [`Image generated successfully at ${new Date().toISOString()}: ${imageUrl}`],
              postThemeId,
              progress: 70,
              imageUrl
            });
          }
        }
      } else {
        console.log(imageUrl ? 
          'Using existing image' : 
          `No image found but post status is ${postTheme.status} - skipping image generation`);
        
        await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
          log: [`Using existing image at ${new Date().toISOString()}: ${imageUrl || 'none'}`],
          postThemeId,
          progress: 70,
          imageExists: !!imageUrl,
          imageUrl: imageUrl || null
        });
      }
      
      // Step 6: Re-fetch the post theme to ensure we have the latest data
      const updatedPostTheme = await getPostTheme(supabaseClient, postThemeId);
      console.log('Final post theme data before WordPress publishing:', {
        postThemeId,
        status: updatedPostTheme.status,
        hasContent: !!updatedPostTheme.post_content,
        contentLength: updatedPostTheme.post_content?.length || 0,
        hasImage: !!updatedPostTheme.image,
        imageUrl: updatedPostTheme.image || 'none'
      });
      
      await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
        log: [`Ready to send to WordPress at ${new Date().toISOString()}`],
        postThemeId,
        progress: 80,
        postThemeStatus: updatedPostTheme.status,
        contentLength: updatedPostTheme.post_content?.length || 0,
        imageUrl: updatedPostTheme.image || null
      });
      
      // Step 7: Send to WordPress (for all statuses - approved, textgenerated, generated)
      console.log('Sending to WordPress with final data:', {
        postThemeId,
        status: updatedPostTheme.status,
        hasImage: !!updatedPostTheme.image,
        imageUrl: updatedPostTheme.image || 'none',
        contentLength: updatedPostTheme.post_content?.length || 0
      });
      
      await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
        log: [`Sending to WordPress at ${new Date().toISOString()}`],
        postThemeId,
        progress: 85,
        step: 'wordpress_publishing'
      });
      
      const wpResult = await sendToWordPress(postThemeId, updatedPostTheme.website_id, token);
      
      await updateQueueJobStatus(supabaseClient, queueJobId, 'processing', {
        log: [`WordPress publishing successful at ${new Date().toISOString()}`],
        postThemeId,
        progress: 90,
        wpPostId: wpResult.post.id,
        wpPostUrl: wpResult.post.link
      });
      
      // Step 8: Update post theme with WordPress results
      await updatePostThemeWithResults(supabaseClient, postThemeId, wpResult, updatedPostTheme.image);
      
      await updateQueueJobStatus(supabaseClient, queueJobId, 'completed', {
        log: [`Process completed successfully at ${new Date().toISOString()}`],
        postThemeId,
        progress: 100,
        wpPostId: wpResult.post.id,
        wpPostUrl: wpResult.post.link,
        success: true,
        post: wpResult.post
      });
      
      // Return the successful response
      return new Response(
        JSON.stringify({
          success: true,
          post: wpResult.post
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error: unknown) {
      console.error('Error during queue job processing:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      await updateQueueJobStatus(supabaseClient, queueJobId, 'failed', {
        log: [`Process failed at ${new Date().toISOString()}: ${errorMessage}`],
        postThemeId,
        error: errorMessage,
        errorStack,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }

  } catch (error: unknown) {
    console.error('[generate-and-publish] Error in function:', error);
    console.error('[generate-and-publish] Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    let postThemeId = 'unknown';
    try {
      const reqBody = await req.json();
      postThemeId = reqBody.postThemeId || 'unknown';
    } catch (parseError) {
      console.error('[generate-and-publish] Error parsing request body:', parseError);
    }
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        postThemeId: postThemeId
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
