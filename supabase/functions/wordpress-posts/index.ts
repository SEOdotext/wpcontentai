// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("WordPress Posts function started")

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
  console.log('Starting WordPress image upload process:', {
    sourceImageUrl: imageUrl,
    wpUrl,
    title,
    hasCredentials: !!wpUsername && !!wpPassword
  });
  
  // Download the image
  const imageResponse = await fetch(imageUrl);
  console.log('Image download response:', {
    status: imageResponse.status,
    ok: imageResponse.ok,
    contentType: imageResponse.headers.get('content-type'),
    contentLength: imageResponse.headers.get('content-length')
  });
  
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }
  
  const imageBlob = await imageResponse.blob();
  console.log('Image blob created:', {
    size: imageBlob.size,
    type: imageBlob.type
  });
  
  // Create form data for WordPress media upload
  const formData = new FormData();
  formData.append('file', imageBlob, 'header-image.png');
  formData.append('title', title);
  
  // Upload to WordPress media library
  console.log('Attempting WordPress media upload...');
  const uploadResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${wpUsername}:${wpPassword}`)
    },
    body: formData
  });
  
  console.log('WordPress media upload response:', {
    status: uploadResponse.status,
    ok: uploadResponse.ok,
    contentType: uploadResponse.headers.get('content-type')
  });
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('WordPress media upload failed:', {
      status: uploadResponse.status,
      error: errorText
    });
    throw new Error(`Failed to upload image to WordPress: ${errorText}`);
  }
  
  const uploadData = await uploadResponse.json();
  console.log('WordPress media upload successful:', {
    mediaId: uploadData.id,
    url: uploadData.source_url,
    title: uploadData.title?.rendered
  });
  
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
  // Get the origin from the request
  const origin = req.headers.get('origin');
  
  // Set CORS headers based on origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS.production[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

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
    
    // Get post theme with categories from junction table
    const { data: postTheme, error: postThemeError } = await supabaseClient
      .from('post_themes')
      .select(`
        *,
        post_theme_categories!inner (
          wordpress_category:wordpress_category_id (
            id,
            wp_category_id
          )
        )
      `)
      .eq('id', post_theme_id)
      .single();

    if (postThemeError) {
      console.error('Error fetching post theme:', postThemeError);
      throw new Error(`Failed to fetch post theme: ${postThemeError.message}`);
    }

    if (!postTheme) {
      throw new Error(`Post theme not found with ID: ${post_theme_id}`);
    }

    // Extract category IDs from the junction table
    const categoryIds = postTheme.post_theme_categories
      .map(link => link.wordpress_category.wp_category_id)
      .filter(id => id !== null);

    // Log detailed image information
    console.log('Post theme data:', {
      id: post_theme_id,
      hasImage: !!postTheme.image,
      imageUrl: postTheme.image || 'No image available',
      contentLength: postTheme.post_content.length,
      subject: postTheme.subject_matter
    });
    
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
      ...(categoryIds.length > 0 && { categories: categoryIds })
    }
    
    // Make the API request to WordPress
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${wpSettings.wp_username}:${wpSettings.wp_application_password}`),
      },
      body: JSON.stringify(postData)
    });
    
    console.log('WordPress API response:', {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress API request failed:', {
        status: response.status,
        error: errorText
      });
      throw new Error(`Failed to update post: ${errorText}`);
    }
    
    const wpResponseData = await response.json();
    console.log('WordPress API response data:', wpResponseData);
    
    return new Response(JSON.stringify(wpResponseData), { headers: corsHeaders });
  } catch (error) {
    console.error('Error in WordPress API request:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})