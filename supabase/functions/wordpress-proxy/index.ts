// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("WordPress Proxy function started - v1.0.6")

// Try multiple endpoints for WordPress API in case some are restricted
const makeWordPressApiRequest = async (baseUrl: string, encodedAuth: string) => {
  console.log('Attempting WordPress API endpoints');
  
  // Common WordPress API endpoints in order of privacy (most private to most public)
  const endpoints = [
    '/wp-json/wp/v2/users/me',           // Requires authentication, shows detailed user info
    '/wp-json',                          // Root API discovery, usually public
    '/wp-json/wp/v2/posts?per_page=1',   // Public posts endpoint, often accessible
    '/wp-json/wp/v2/pages?per_page=1',   // Public pages endpoint, sometimes accessible
  ];
  
  // Error storage to track failures
  const errors: any[] = [];
  
  // Try each endpoint in sequence
  for (const endpoint of endpoints) {
    const fullUrl = `${baseUrl}${endpoint}`;
    console.log(`Trying endpoint: ${fullUrl}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${encodedAuth}`,
          'User-Agent': 'WP Content AI/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`Endpoint ${endpoint} response:`, {
        status: response.status,
        statusText: response.statusText
      });
      
      // Check if we got a valid response (not checking .ok to catch more responses)
      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();
      
      // Check if response looks like HTML
      if (responseText.includes('<!DOCTYPE') || 
          responseText.includes('<html') ||
          responseText.includes('<body')) {
        
        console.log(`Endpoint ${endpoint} returned HTML`);
        errors.push({
          endpoint,
          status: response.status,
          error: 'Received HTML instead of JSON'
        });
        continue;
      }
      
      // Try to parse JSON
      try {
        const data = JSON.parse(responseText);
        console.log(`Successfully parsed JSON from ${endpoint}`);
        
        // For the root endpoint, do some additional validation
        if (endpoint === '/wp-json' && (!data.namespaces || !data.routes)) {
          console.log('Root endpoint response missing namespaces/routes - may not be WordPress');
          errors.push({
            endpoint,
            status: response.status,
            error: 'Response is valid JSON but does not look like WordPress REST API'
          });
          continue;
        }
        
        // We found a valid endpoint!
        return {
          success: true,
          endpoint,
          data,
          status: response.status
        };
      } catch (parseError: any) {
        console.log(`Failed to parse JSON from ${endpoint}:`, parseError.message);
        errors.push({
          endpoint,
          status: response.status,
          error: `Invalid JSON: ${parseError.message}`
        });
      }
    } catch (fetchError: any) {
      console.error(`Error fetching ${endpoint}:`, fetchError);
      errors.push({
        endpoint,
        error: fetchError.message
      });
    }
  }
  
  // If we're here, all endpoints failed
  return {
    success: false,
    errors,
    message: 'All WordPress API endpoints failed'
  };
};

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
    } catch (parseError: any) {
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
      } catch (encodingError: any) {
        console.error('Base64 encoding error:', encodingError);
        throw new Error(`Auth encoding failed: ${encodingError.message}`);
      }
    } catch (authError: any) {
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
    
    // Make WordPress API request using the endpoint tester
    try {
      const result = await makeWordPressApiRequest(formattedUrl, encodedAuth);
      
      if (result.success) {
        console.log('WordPress API request successful on endpoint:', result.endpoint);
        
        return new Response(
          JSON.stringify({
            success: true,
            data: result.data,
            endpoint: result.endpoint,
            statusCode: result.status,
            message: `Connected successfully to WordPress via ${result.endpoint}`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      } else {
        console.error('All WordPress API endpoints failed:', result.errors);
        
        // Detailed error information
        const errorSummary = result.errors.map((err: any) => 
          `${err.endpoint}: ${err.status || 'N/A'} - ${err.error}`
        ).join('; ');
        
        // Try to detect if WordPress is installed at all
        const wordpressSignaturesFound = result.errors.some((err: any) => 
          err.error && (
            err.error.includes('wp-') || 
            err.error.includes('WordPress') ||
            err.error.includes('wp-login')
          )
        );
        
        // Prepare a user-friendly error message
        let userMessage = 'Failed to connect to WordPress REST API.';
        
        if (wordpressSignaturesFound) {
          userMessage += ' WordPress appears to be installed, but the REST API may be disabled or restricted.';
        } else {
          userMessage += ' Could not detect a WordPress installation at the provided URL.';
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            error: userMessage,
            detailedErrors: result.errors,
            errorSummary,
            wordpressDetected: wordpressSignaturesFound
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
    } catch (error: any) {
      console.error('Error processing WordPress API request:', error);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error processing WordPress API request: ${error.message || 'Unknown error'}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
  } catch (error: any) {
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
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/wordpress-proxy' \
//   --header 'Content-Type: application/json' \
//   --data '{"wpUrl":"example.com","username":"admin","password":"xxxx xxxx xxxx xxxx"}' 