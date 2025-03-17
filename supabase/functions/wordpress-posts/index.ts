// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("WordPress Posts function started")

interface PostRequest {
  website_id: string
  title: string
  content: string
  status: 'draft' | 'publish'
  post_id?: number // Include for updates
  action: 'create' | 'update'
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
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Get user ID from auth
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()
    
    if (!user) {
      throw new Error('Not authorized')
    }
    
    // Extract request data
    const { website_id, title, content, status, post_id, action } = await req.json() as PostRequest
    
    // Validate input
    if (!website_id || !title || !content || !status || !action) {
      throw new Error('Missing required fields')
    }
    
    if (action === 'update' && !post_id) {
      throw new Error('Post ID is required for update operation')
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
    
    if (action === 'create') {
      apiUrl = `${wpSettings.wp_url}/wp-json/wp/v2/posts`
      method = 'POST'
    } else {
      // Update operation
      apiUrl = `${wpSettings.wp_url}/wp-json/wp/v2/posts/${post_id}`
      method = 'PUT'
    }
    
    // Prepare post data
    const postData = {
      title,
      content,
      status
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