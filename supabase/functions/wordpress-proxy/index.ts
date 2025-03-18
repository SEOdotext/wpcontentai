// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("WordPress Proxy function started - v1.0.5")

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
    console.log('Incoming request received:', req.method, req.url);
    
    // Clone the request to read its body twice
    const clonedReq = req.clone();
    
    // Log raw request body for debugging
    try {
      const rawBody = await clonedReq.text();
      console.log('Raw request body:', rawBody);
      
      // If body is empty, return early with error
      if (!rawBody.trim()) {
        console.error('Empty request body');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Empty request body'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
    } catch (rawBodyError) {
      console.error('Failed to read raw request body:', rawBodyError);
    }
    
    // Parse request body as JSON
    let requestData;
    try {
      requestData = await req.json();
      console.log('Request body parsed successfully');
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid JSON in request body: ${parseError.message}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    // Extract and validate parameters
    const wpUrl = requestData?.wpUrl;
    const username = requestData?.username;
    const password = requestData?.password;
    
    console.log('Request parameters received:', { 
      wpUrl: wpUrl || 'missing', 
      username: username || 'missing', 
      passwordPresent: !!password,
      passwordLength: password ? password.length : 0
    });
    
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
    
    // Process WordPress URL
    let formattedUrl = wpUrl;
    
    // Add protocol if missing
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
      console.log('Added HTTPS protocol to URL:', formattedUrl);
    }
    
    // Remove trailing slashes
    formattedUrl = formattedUrl.replace(/\/+$/, '');
    
    // Create API endpoint URL
    // Try using the /users/me endpoint first, but we'll also have a fallback
    const wpApiUrl = `${formattedUrl}/wp-json/wp/v2/users/me`;
    console.log('WordPress API URL:', wpApiUrl);
    
    // Create Base64 authentication
    let encodedAuth;
    try {
      // Log detailed password info for debugging (safely)
      console.log('Password info:', {
        type: typeof password,
        length: password.length,
        format: password.replace(/[^\s]/g, 'x'),
        containsSpaces: password.includes(' '),
        isEmpty: password.trim() === ''
      });
      
      // Create auth string
      const authString = `${username}:${password}`;
      console.log('Auth string created with length:', authString.length);
      
      // Base64 encode
      try {
        encodedAuth = btoa(authString);
        console.log('Authentication encoded successfully, length:', encodedAuth.length);
      } catch (encodingError) {
        console.error('Base64 encoding error:', encodingError);
        throw new Error(`Auth encoding failed: ${encodingError.message}`);
      }
    } catch (authError) {
      console.error('Authentication preparation error:', authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Authentication error: ${authError.message}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    // Make WordPress API request
    try {
      console.log('Sending WordPress API request to:', wpApiUrl);
      const controller = new AbortController();
      
      // Set timeout for the request
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Make the HTTP request with timeout
      const response = await fetch(wpApiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${encodedAuth}`,
          'User-Agent': 'WP Content AI/1.0',
          'Accept': 'application/json' // Explicitly request JSON
        },
        signal: controller.signal
      });
      
      // Clear timeout since request completed
      clearTimeout(timeoutId);
      
      console.log('WordPress API response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Handle response based on status
      if (!response.ok) {
        // Prepare user-friendly error message
        let errorMsg = `WordPress API error: ${response.status} ${response.statusText}`;
        
        // More specific messages for common error codes
        if (response.status === 401) {
          errorMsg = 'Invalid WordPress username or application password';
        } else if (response.status === 404) {
          errorMsg = 'WordPress API endpoint not found. Make sure the site has the REST API enabled';
        } else if (response.status === 403) {
          errorMsg = 'Access forbidden. Check if your WordPress credentials have sufficient permissions';
        } else if (response.status === 500) {
          errorMsg = 'WordPress server error. Please check your WordPress error logs';
        }
        
        // Try to get more detailed error information from response body
        let errorBody = '';
        let isHtmlResponse = false;
        
        try {
          errorBody = await response.text();
          console.log('Error response body preview:', errorBody.substring(0, 200) + '...');
          
          // Check if response is HTML instead of JSON
          if (errorBody.trim().startsWith('<!DOCTYPE') || errorBody.trim().startsWith('<html')) {
            isHtmlResponse = true;
            console.log('Received HTML response instead of JSON - REST API may be disabled');
            errorMsg = 'WordPress returned HTML instead of JSON. The REST API may be disabled or the site might be redirecting to a login page.';
          } else {
            try {
              const errorJson = JSON.parse(errorBody);
              console.log('Error response JSON:', errorJson);
              
              if (errorJson.message) {
                errorMsg = errorJson.message;
              }
            } catch (jsonError) {
              console.log('Error body is not valid JSON:', jsonError.message);
              
              // Check if it's returning HTML even though it didn't start with doctype
              if (errorBody.includes('<html') || errorBody.includes('<body')) {
                isHtmlResponse = true;
                errorMsg = 'WordPress returned HTML instead of JSON. The REST API may be disabled or not properly configured.';
              }
            }
          }
        } catch (bodyError) {
          console.error('Failed to read error response body:', bodyError);
        }
        
        // Try a fallback to check if WordPress is accessible at all
        let wordpressDetected = false;
        
        if (isHtmlResponse) {
          // Check for WordPress-specific strings in the HTML
          if (errorBody.includes('wp-') || 
              errorBody.includes('WordPress') || 
              errorBody.includes('wp-content') || 
              errorBody.includes('wp-includes')) {
            wordpressDetected = true;
            console.log('WordPress installation detected, but API endpoint not available');
          }
          
          // Try to determine if we're dealing with a login page or similar
          if (errorBody.includes('wp-login') || errorBody.includes('login_form') || errorBody.includes('user_login')) {
            errorMsg = 'WordPress site is redirecting to login page. REST API may require authentication or is not accessible.';
          }
        }
        
        // Return error response
        return new Response(
          JSON.stringify({
            success: false,
            error: errorMsg,
            statusCode: response.status,
            wordpressDetected,
            isHtmlResponse
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
      
      // Process successful response
      try {
        // First check content type to make sure we're actually getting JSON
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.warn('Response has non-JSON content type:', contentType);
          
          // Try to parse anyway, but be cautious
          const responseText = await response.text();
          
          // Check if it looks like HTML
          if (responseText.trim().startsWith('<!DOCTYPE') || 
              responseText.trim().startsWith('<html') ||
              responseText.includes('<body') ||
              responseText.includes('<head')) {
            
            return new Response(
              JSON.stringify({
                success: false,
                error: 'WordPress returned HTML instead of JSON. The REST API may not be properly configured.',
                isHtmlResponse: true
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            );
          }
          
          // Try to parse as JSON anyway
          try {
            const data = JSON.parse(responseText);
            console.log('Successfully parsed response despite incorrect content type');
            
            return new Response(
              JSON.stringify({
                success: true,
                data,
                statusCode: response.status,
                warningNonJsonContentType: contentType
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
              }
            );
          } catch (parseErr) {
            console.error('Failed to parse response text as JSON:', parseErr);
            return new Response(
              JSON.stringify({
                success: false,
                error: `WordPress returned non-JSON response with content type: ${contentType}`,
                contentPreview: responseText.substring(0, 200) + '...'
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            );
          }
        }
        
        const data = await response.json();
        console.log('WordPress API request successful');
        
        return new Response(
          JSON.stringify({
            success: true,
            data,
            statusCode: response.status
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      } catch (parseError) {
        console.error('Error parsing successful response:', parseError);
        
        // Get the raw text to see what we're dealing with
        try {
          const responseText = await response.clone().text();
          const preview = responseText.substring(0, 200) + '...';
          console.log('Response text preview:', preview);
          
          // Check if it's HTML
          const isHtml = responseText.includes('<!DOCTYPE') || 
                        responseText.includes('<html') || 
                        responseText.includes('<body');
          
          if (isHtml) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'WordPress returned HTML instead of JSON data. The REST API may be disabled or misconfigured.',
                isHtmlResponse: true
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            );
          }
          
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to parse WordPress response: ${parseError.message}`,
              responsePreview: preview
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          );
        } catch (textError) {
          // If we can't even get the text, just return the original error
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to parse WordPress response: ${parseError.message}`
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          );
        }
      }
    } catch (fetchError) {
      console.error('Network error during WordPress API request:', fetchError);
      
      // Check if the error is a timeout
      const errorMessage = fetchError.name === 'AbortError'
        ? 'WordPress request timed out after 10 seconds'
        : `WordPress request failed: ${fetchError.message}`;
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
  } catch (error) {
    // Catch any unhandled errors
    console.error('Unhandled error in Edge Function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `Edge Function error: ${error.message || 'Unknown error'}`,
        stack: error.stack
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