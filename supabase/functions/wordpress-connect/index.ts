// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("WordPress Connect function started")

interface AuthRequest {
  url: string
  username: string
  password: string
  website_id: string
  action?: string // Add action parameter to support different operations
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
    const requestBody = await req.json();
    console.log('Request body received:', {
      ...requestBody,
      // Don't log actual password
      password: requestBody.password ? 
        `${requestBody.password.length} chars (format: "${requestBody.password.replace(/\S/g, "x")}")` : 
        'missing'
    });
    
    const { url, username, password, website_id, action = 'connect' } = requestBody as AuthRequest;
    
    if (!url || !username || !password) {
      console.error('Missing required fields in request:', { 
        hasUrl: !!url, 
        hasUsername: !!username, 
        hasPassword: !!password
      });
      throw new Error('Missing required fields')
    }
    
    // Additional validation for connect action
    if (action === 'connect' && !website_id) {
      console.error('Missing website_id field for connect action');
      throw new Error('Missing website_id field')
    }
    
    console.log(`WordPress operation: ${action} for website: ${url}`)
    
    // Construct proper URL for WordPress API
    let apiUrl = url
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = 'https://' + apiUrl
    }
    
    try {
      // Clean URL by removing WordPress paths
      const parsedUrl = new URL(apiUrl)
      const pathname = parsedUrl.pathname
      if (pathname.includes('/wp-admin') || pathname.includes('/wp-login') || pathname.includes('/wp-content')) {
        parsedUrl.pathname = '/'
      }
      apiUrl = parsedUrl.toString()
    } catch (error) {
      console.error('Error parsing URL:', error)
      // Continue with current URL if parsing fails
    }
    
    // Clean any trailing slashes
    apiUrl = apiUrl.replace(/\/+$/, '')
    const wpApiUrl = `${apiUrl}/wp-json/wp/v2/users/me`
    
    console.log(`Testing WordPress API at: ${wpApiUrl}`)

    try {
      // Test the credentials first
      const apiResponse = await fetch(wpApiUrl, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${username}:${password}`)
        }
      })

      console.log('WordPress API response status:', apiResponse.status);
      console.log('WordPress API response headers:', Object.fromEntries(apiResponse.headers.entries()));

      if (!apiResponse.ok) {
        console.error(`WordPress API error: ${apiResponse.status} ${apiResponse.statusText}`)
        let errorMessage = 'WordPress authentication failed'
        
        // Try to parse the error response
        try {
          const errorData = await apiResponse.json()
          console.error('WordPress API error details:', errorData)
          if (errorData.message) {
            errorMessage = errorData.message
          }
        } catch (e) {
          console.error('Could not parse WordPress API error response', e);
          // If can't parse error, use status code information
          if (apiResponse.status === 401) {
            errorMessage = 'Invalid WordPress credentials'
          } else if (apiResponse.status === 404) {
            errorMessage = 'WordPress API endpoint not found. Make sure this is a WordPress site with REST API enabled'
          }
        }
        
        throw new Error(errorMessage)
      }

      // Get the user data from WordPress
      const userData = await apiResponse.json()
      console.log('WordPress authentication successful, user data:', userData)
      
      // Handle different actions
      if (action === 'test') {
        // For test action, just return success without saving to DB
        return new Response(
          JSON.stringify({
            success: true,
            message: 'WordPress connection test successful',
            wordpress_user: userData.name,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }
      
      // For connect action (default), save credentials to DB
      console.log('Saving WordPress credentials to database for website_id:', website_id);
      const { data, error } = await supabaseClient
        .from('wordpress_settings')
        .upsert({
          website_id: website_id,
          wp_url: apiUrl,
          wp_username: username,
          wp_application_password: password,
          is_connected: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('Database error:', error)
        throw new Error(`Failed to save WordPress connection: ${error.message}`)
      }
      
      console.log('WordPress credentials saved successfully');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'WordPress connection successful',
          wordpress_user: userData.name,
          settings: data
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } catch (fetchError) {
      console.error('Error during WordPress API fetch:', fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error(`Error in WordPress Connect function: ${error.message}`)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred',
        errorType: error.constructor.name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/wordpress-connect' \
//   --header 'Authorization: Bearer <JWT>' \
//   --header 'Content-Type: application/json' \
//   --data '{"url":"example.com","username":"admin","password":"xxxx xxxx xxxx xxxx","website_id":"abc-123"}' 