import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Get allowed origins from environment variables
const ALLOWED_ORIGINS = {
  production: Deno.env.get('ALLOWED_ORIGINS_PROD')?.split(',') || ['https://contentgardener.ai', 'https://contentgardener.ai/'],
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
    const { websiteId, existingCategories = [] } = await req.json();
    const authHeader = req.headers.get('Authorization');
    console.log('Received request for websiteId:', websiteId);
    console.log('Existing categories to exclude:', existingCategories);

    if (!websiteId) {
      throw new Error('Missing required field: websiteId');
    }

    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Extract the token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    console.log('Using auth token for internal function calls');

    // Get website settings
    const { data: website, error: websiteError } = await supabaseClient
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .single();

    if (websiteError) {
      console.error('Database error fetching website:', websiteError);
      throw new Error('Failed to fetch website settings: ' + websiteError.message);
    }

    if (!website) {
      throw new Error('Website not found with ID: ' + websiteId);
    }

    // Get recent post themes for content analysis
    const { data: postThemes, error: postThemesError } = await supabaseClient
      .from('post_themes')
      .select('subject_matter, keywords')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (postThemesError) {
      console.error('Database error fetching post themes:', postThemesError);
      throw new Error('Failed to fetch post themes: ' + postThemesError.message);
    }

    // Extract keywords and subject matters
    const keywords = postThemes.flatMap(theme => theme.keywords || []);
    const subjectMatters = postThemes.map(theme => theme.subject_matter);

    // Generate category ideas using OpenAI with language context
    const systemPrompt = "You are a content strategist helping to generate category ideas for a WordPress website. Generate 5 unique, relevant category names based on the provided content themes and keywords. Each category should be concise (1-3 words) and use kebab-case for the slug. Generate the categories in the website's language (" + (website.language || 'en') + ").\n\nIMPORTANT: \n1. Do not generate any categories that are already in use. Here are the existing categories to avoid:\n" + existingCategories.map(c => "- " + c).join('\n') + "\n\n2. Category names should be human-readable and NOT contain hyphens. Use spaces and proper capitalization instead.\n3. Only use kebab-case for the slug field, not the category name.\n\nFormat each category exactly like this, one per line:\nCategory Name|category-name-slug\n\nExamples:\nDigital Marketing|digital-marketing\nContent Strategy|content-strategy\nSocial Media Tips|social-media-tips\nBusiness Growth|business-growth";
    
    const userPrompt = "Based on these content themes: " + subjectMatters.join(', ') + " and keywords: " + keywords.join(', ') + ", generate 5 category ideas in " + (website.language || 'English') + ". Return only the category-name|slug pairs, one per line, with no additional formatting, numbers, or markers.";

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + Deno.env.get('OPENAI_API_KEY')
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error("OpenAI API error: " + response.statusText);
    }

    const result = await response.json();
    const categories = result.choices[0].message.content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [name, slug] = line.split('|');
        return { name: name.trim(), slug: slug.trim() };
      });

    // Double-check that no generated categories match existing ones
    const filteredCategories = categories.filter(category => 
      !existingCategories.includes(category.name.toLowerCase())
    );

    console.log('Generated categories:', filteredCategories);

    return new Response(
      JSON.stringify({
        success: true,
        categories: filteredCategories
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-category-ideas function:', error);
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