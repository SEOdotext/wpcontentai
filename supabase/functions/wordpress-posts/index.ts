// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("WordPress Posts function started")

interface PostRequest {
  website_id: string
  post_theme_id: string
  action: 'create' | 'update'
}

// Add function to upload image to WordPress media library
async function uploadImageToWordPress(
  imageUrl: string,
  wpUrl: string,
  wpUsername: string,
  wpPassword: string,
  title: string
): Promise<{ url: string; id: number }> {
  console.log('Uploading image to WordPress media library:', imageUrl);
  
  // Download the image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }
  
  const imageBlob = await imageResponse.blob();
  
  // Create form data for WordPress media upload
  const formData = new FormData();
  formData.append('file', imageBlob, 'header-image.png');
  formData.append('title', title);
  
  // Upload to WordPress media library
  const uploadResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${wpUsername}:${wpPassword}`)
    },
    body: formData
  });
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload image to WordPress: ${errorText}`);
  }
  
  const uploadData = await uploadResponse.json();
  console.log('Image uploaded successfully:', uploadData.source_url);
  return { url: uploadData.source_url, id: uploadData.id };
}

// Helper function to get WordPress category IDs from category names
async function getCategoryIds(
  supabase: any,
  websiteId: string,
  categoryNames: string[],
  wpUrl: string,
  wpUsername: string,
  wpPassword: string
): Promise<number[]> {
  console.log('Getting category IDs for:', categoryNames);
  
  if (!categoryNames || categoryNames.length === 0) {
    return [];
  }
  
  // First, try to get category IDs from our database
  const { data: categories, error } = await supabase
    .from('wordpress_categories')
    .select('wp_category_id, name')
    .eq('website_id', websiteId)
    .in('name', categoryNames);

  if (error) {
    console.error('Error fetching categories from database:', error);
    // Continue and try to fetch from WordPress directly
  }
  
  // If we found all categories in our database, use those IDs
  if (categories && categories.length === categoryNames.length) {
    console.log('Found all categories in database:', categories);
    return categories.map(cat => cat.wp_category_id);
  }
  
  // If not all categories were found, fetch from WordPress
  console.log('Fetching categories from WordPress');
  try {
    const response = await fetch(`${wpUrl}/wp-json/wp/v2/categories?per_page=100`, {
      headers: {
        'Authorization': `Basic ${btoa(`${wpUsername}:${wpPassword}`)}`
      }
    });
    
    if (!response.ok) {
      console.error('Error fetching categories from WordPress:', response.statusText);
      // Return whatever we found in the database
      return categories ? categories.map(cat => cat.wp_category_id) : [];
    }
    
    const wpCategories = await response.json();
    
    // Filter for the categories we need
    const matchedCategories = wpCategories
      .filter(cat => categoryNames.includes(cat.name))
      .map(cat => cat.id);
    
    console.log('Matched WordPress categories:', matchedCategories);
    
    return matchedCategories;
  } catch (fetchError) {
    console.error('Error in WordPress API request:', fetchError);
    // Return whatever we found in the database
    return categories ? categories.map(cat => cat.wp_category_id) : [];
  }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    // Create Supabase client using auth from request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Get user ID from auth
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()
    
    if (!user) {
      throw new Error('Not authorized')
    }
    
    // Extract request data - now we only need minimal data
    const { website_id, post_theme_id, action } = await req.json() as PostRequest
    
    // Validate input
    if (!website_id || !post_theme_id || !action) {
      throw new Error('Missing required fields')
    }
    
    // Get post theme data from database
    const { data: postTheme, error: postThemeError } = await supabaseClient
      .from('post_themes')
      .select('*')
      .eq('id', post_theme_id)
      .single();
    
    if (postThemeError) {
      throw new Error('Failed to retrieve post theme data');
    }

    if (!postTheme) {
      throw new Error('Post theme not found');
    }

    if (!postTheme.post_content) {
      throw new Error('Post has no content');
    }
    
    // Get WordPress settings for this website
    const { data: wpSettings, error: settingsError } = await supabaseClient
      .from('wordpress_settings')
      .select('*')
      .eq('website_id', website_id)
      .single()
    
    if (settingsError) {
      throw new Error('Failed to retrieve WordPress settings for this website')
    }
    
    if (!wpSettings || !wpSettings.wp_url || !wpSettings.wp_username || !wpSettings.wp_application_password) {
      throw new Error('WordPress connection not configured for this website')
    }
    
    console.log(`WordPress ${action} post operation for website ID: ${website_id}`)
    
    let apiUrl
    let method
    
    // Determine post status - use the setting from wordpress_settings (defaulting to 'draft' if not set)
    const postStatus = wpSettings.publish_status || 'draft'
    console.log(`Using WordPress post status: ${postStatus}`)
    
    if (action === 'create') {
      apiUrl = `${wpSettings.wp_url}/wp-json/wp/v2/posts`
      method = 'POST'
    } else {
      // Update operation
      if (!postTheme.wp_post_id) {
        throw new Error('Post ID is required for update operation')
      }
      apiUrl = `${wpSettings.wp_url}/wp-json/wp/v2/posts/${postTheme.wp_post_id}`
      method = 'PUT'
    }
    
    // Handle image upload if image exists in post theme
    let finalContent = postTheme.post_content;
    let uploadedImageId: number | undefined;
    let wpImageUrl: string | undefined;
    if (postTheme.image) {
      try {
        console.log('Processing image upload for post:', {
          postId: post_theme_id,
          imageUrl: postTheme.image
        });
        const { url: imageUrl, id: mediaId } = await uploadImageToWordPress(
          postTheme.image,
          wpSettings.wp_url,
          wpSettings.wp_username,
          wpSettings.wp_application_password,
          postTheme.subject_matter
        );
        
        // Replace the original image URL with the WordPress media URL
        finalContent = postTheme.post_content.replaceAll(postTheme.image, imageUrl);
        uploadedImageId = mediaId;
        wpImageUrl = imageUrl;
        console.log('Image processed and content updated:', {
          postId: post_theme_id,
          wpImageUrl,
          mediaId
        });
      } catch (imageError) {
        console.error('Error uploading image to WordPress:', {
          postId: post_theme_id,
          error: imageError.message,
          originalImageUrl: postTheme.image
        });
        // Continue with original content if image upload fails
        wpImageUrl = postTheme.image; // Keep the original image URL if upload fails
      }
    }
    
    // Prepare post data with processed content and featured media if available
    const postData = {
      title: postTheme.subject_matter,
      content: finalContent,
      status: postStatus,
      ...(uploadedImageId && { featured_media: uploadedImageId }),
      // Add categories if they exist
      ...(postTheme.categories && postTheme.categories.length > 0 && { 
        categories: await getCategoryIds(
          supabaseClient, 
          website_id, 
          postTheme.categories,
          wpSettings.wp_url,
          wpSettings.wp_username,
          wpSettings.wp_application_password
        ) 
      })
    }
    
    // Make the API request to WordPress
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${wpSettings.wp_username}:${wpSettings.wp_application_password}`)
      },
      body: JSON.stringify(postData)
    })
    
    if (!response.ok) {
      // Try to get more detailed error
      let errorMessage = `WordPress API error: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch (e) {
        // Use default error message if can't parse
      }
      throw new Error(errorMessage)
    }
    
    // Parse the response to get the post details
    const postResponse = await response.json()
    
    // If we uploaded an image, set it as the featured image
    if (postTheme.image && postResponse.id) {
      try {
        // Set the featured image for the post
        const featuredImageResponse = await fetch(`${wpSettings.wp_url}/wp-json/wp/v2/posts/${postResponse.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(`${wpSettings.wp_username}:${wpSettings.wp_application_password}`)
          },
          body: JSON.stringify({
            featured_media: postResponse.featured_media || postResponse.id
          })
        });

        if (!featuredImageResponse.ok) {
          console.error('Failed to set featured image:', await featuredImageResponse.text());
        } else {
          console.log('Successfully set featured image for post');
        }
      } catch (featuredImageError) {
        console.error('Error setting featured image:', featuredImageError);
      }
    }
    
    // Update post theme with WordPress information
    console.log('Updating post theme with WordPress information:', {
      postId: post_theme_id,
      wpPostId: postResponse.id.toString(),
      wpPostUrl: postResponse.link,
      wpImageUrl
    });
    
    const { error: updateError } = await supabaseClient
      .from('post_themes')
      .update({
        status: 'published',
        wp_post_id: postResponse.id.toString(),
        wp_post_url: postResponse.link,
        wp_sent_date: new Date().toISOString(),
        ...(wpImageUrl && { wp_image_url: wpImageUrl })
      })
      .eq('id', post_theme_id);

    if (updateError) {
      console.error('Error updating post theme:', {
        postId: post_theme_id,
        error: updateError.message
      });
      // Don't throw here as the post was created successfully
    } else {
      console.log('Successfully updated post theme with WordPress information');
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Post ${action === 'create' ? 'created' : 'updated'} successfully`,
        post: {
          id: postResponse.id,
          title: postResponse.title.rendered,
          status: postResponse.status,
          url: postResponse.link
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
    
  } catch (error) {
    console.error(`Error in WordPress Posts function: ${error.message}`)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/wordpress-posts' \
//   --header 'Authorization: Bearer <JWT>' \
//   --header 'Content-Type: application/json' \
//   --data '{"website_id":"abc-123","title":"Test Post","content":"This is a test post","status":"draft","action":"create"}' 