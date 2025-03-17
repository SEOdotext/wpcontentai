// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("WordPress Proxy function started")

serve(async (req) => {
  // Set up CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // In production, restrict this to your domain
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    console.log('Incoming request received');
    
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
      console.log('Request body parsed successfully');
    } catch (parseError) {
      console.error('Error parsing request body:', parseError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    // Extract parameters
    const wpUrl = requestData.wpUrl;
    const username = requestData.username;
    const password = requestData.password;
    
    console.log(`Request parameters: URL=${wpUrl || 'missing'}, Username=${username || 'missing'}, Password length=${password ? password.length : 0}`);
    
    // Validation
    if (!wpUrl || !username || !password) {
      const missing = [];
      if (!wpUrl) missing.push('wpUrl');
      if (!username) missing.push('username'); 
      if (!password) missing.push('password');
      
      const errorMsg = `Missing required parameters: ${missing.join(', ')}`;
      console.error(errorMsg);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMsg
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    // Construct WordPress API URL
    const apiUrl = wpUrl.startsWith('http') ? wpUrl : `https://${wpUrl}`;
    const wpApiUrl = `${apiUrl.replace(/\/+$/, '')}/wp-json/wp/v2/users/me`;
    console.log(`WordPress API URL: ${wpApiUrl}`);
    
    // Create authentication string
    let encodedAuth;
    try {
      const authString = `${username}:${password}`;
      encodedAuth = btoa(authString);
      console.log('Authentication encoded successfully');
    } catch (authError) {
      console.error('Error encoding authentication:', authError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Authentication encoding error: ${authError.message}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    // Make WordPress API request
    try {
      console.log('Sending request to WordPress API');
      const response = await fetch(wpApiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${encodedAuth}`,
          'User-Agent': 'WP Content AI/1.0'
        }
      });
      
      console.log(`WordPress API response status: ${response.status}`);
      
      if (!response.ok) {
        let errorMsg = `WordPress API error: ${response.status} ${response.statusText}`;
        
        if (response.status === 401) {
          errorMsg = 'Invalid WordPress username or application password';
        } else if (response.status === 404) {
          errorMsg = 'WordPress API not found. Make sure the site has the REST API enabled';
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            error: errorMsg,
            status: response.status
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
      
      // Get the successful response
      const data = await response.json();
      console.log('WordPress API request successful');
      
      return new Response(
        JSON.stringify({
          success: true,
          data,
          status: response.status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } catch (apiError) {
      console.error('Error calling WordPress API:', apiError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: `WordPress API request failed: ${apiError.message}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
  } catch (error) {
    console.error('Unhandled error in Edge Function:', error.message);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `Edge Function error: ${error.message || 'Unknown error'}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/wordpress-proxy' \
//   --header 'Content-Type: application/json' \
//   --data '{"wpUrl":"example.com","username":"admin","password":"xxxx xxxx xxxx xxxx"}' 