import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Define OpenAI request interface
interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

// Timeout utility for fetch requests
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Main function handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    );
    
    // Get user ID from auth - ensure the request is authenticated
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    // Extract request data
    const requestData = await req.json();
    const { service, payload } = requestData;
    
    console.log(`Processing ${service} request`, { 
      user_id: user.id,
      service: service
    });
    
    // Check which AI service is being called
    if (service === 'openai') {
      return await handleOpenAIRequest(payload);
    } else {
      throw new Error(`Unsupported AI service: ${service}`);
    }
  } catch (error) {
    console.error('Error in AI service:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Handle OpenAI API requests
async function handleOpenAIRequest(payload: OpenAIRequest) {
  try {
    // Get OpenAI API key from environment
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Log request details (without sensitive data)
    console.log('OpenAI request details:', {
      model: payload.model,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
      message_count: payload.messages?.length || 0
    });
    
    // Validate basic requirements
    if (!payload.model) {
      throw new Error('Model parameter is required');
    }
    
    if (!payload.messages || !Array.isArray(payload.messages) || payload.messages.length === 0) {
      throw new Error('At least one message is required');
    }
    
    // Make the OpenAI API request with timeout
    const response = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      },
      30000 // 30 second timeout
    );
    
    // Handle API errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new Error(`OpenAI API error (${response.status}): ${
        errorData?.error?.message || response.statusText || 'Unknown error'
      }`);
    }
    
    // Process successful response
    const data = await response.json();
    console.log('OpenAI API success:', {
      model: data.model,
      usage: data.usage,
      choices_count: data.choices?.length || 0
    });
    
    // Return response to client
    return new Response(
      JSON.stringify({ 
        ...data,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('OpenAI request error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
} 