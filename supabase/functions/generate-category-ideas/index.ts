import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
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
      throw new Error(`Failed to fetch website settings: ${websiteError.message}`);
    }

    if (!website) {
      throw new Error(`Website not found with ID: ${websiteId}`);
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
      throw new Error(`Failed to fetch post themes: ${postThemesError.message}`);
    }

    // Extract keywords and subject matters
    const keywords = postThemes.flatMap(theme => theme.keywords || []);
    const subjectMatters = postThemes.map(theme => theme.subject_matter);

    // Generate category ideas using OpenAI with language context
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a content strategist helping to generate category ideas for a WordPress website. Generate 5 unique, relevant category names based on the provided content themes and keywords. Each category should be concise (1-3 words) and use kebab-case for the slug. Generate the categories in the website's language (${website.language || 'en'}).

IMPORTANT: 
1. Do not generate any categories that are already in use. Here are the existing categories to avoid:
${existingCategories.map(c => `- ${c}`).join('\n')}

2. Category names should be human-readable and NOT contain hyphens. Only use hyphens in the slug.
3. For Danish categories, follow proper Danish capitalization rules (first word capitalized, other words lowercase unless they are proper nouns).

Format each category exactly like this, one per line:
Category Name|category-name-slug
Digital Marketing|digital-marketing
Content Strategy|content-strategy`
          },
          {
            role: 'user',
            content: `Based on these content themes: ${subjectMatters.join(', ')} and keywords: ${keywords.join(', ')}, generate 5 category ideas in ${website.language || 'English'}. Return only the category-name|slug pairs, one per line, with no additional formatting, numbers, or markers.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
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