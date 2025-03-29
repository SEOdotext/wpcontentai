import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Get allowed origins from environment variables
const ALLOWED_ORIGINS = {
  production: Deno.env.get('ALLOWED_ORIGINS_PROD')?.split(',') || ['https://websitetexts.com'],
  staging: Deno.env.get('ALLOWED_ORIGINS_STAGING')?.split(',') || ['https://staging.websitetexts.com', 'http://localhost:8080']
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

interface WebsiteContent {
  id: string;
  title: string;
  url: string;
  content_type: string;
  is_cornerstone: boolean;
}

serve(async (req) => {
  console.log('Received request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

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
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the request body
    const { website_id } = await req.json();
    console.log('Processing request for website_id:', website_id);

    if (!website_id) {
      throw new Error('Website ID is required');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('Supabase URL available:', !!supabaseUrl);
    console.log('Supabase key available:', !!supabaseKey);

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseKey ?? ''
    );

    // Fetch website content
    console.log('Fetching website content...');
    const { data: content, error: contentError } = await supabaseClient
      .from('website_content')
      .select('id, title, url, content_type, is_cornerstone')
      .eq('website_id', website_id)
      .order('created_at', { ascending: true });

    if (contentError) {
      console.error('Error fetching content:', contentError);
      throw contentError;
    }

    if (!content || content.length < 10) {
      console.log('Not enough content:', content?.length || 0, 'pages');
      return new Response(
        JSON.stringify({
          error: 'Not enough content',
          message: 'Please import at least 10 pages before requesting key content suggestions.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Filter out pages that are already marked as cornerstone
    const nonCornerstoneContent = content.filter(page => !page.is_cornerstone);
    console.log('Found', nonCornerstoneContent.length, 'non-cornerstone pages');

    if (nonCornerstoneContent.length === 0) {
      console.log('No available content to suggest');
      return new Response(
        JSON.stringify({
          error: 'No available content',
          message: 'All pages are already marked as key content.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate how many pages to suggest (20% of total, up to 10)
    const totalPages = nonCornerstoneContent.length;
    const suggestedCount = Math.min(Math.ceil(totalPages * 0.2), 10);
    console.log('Will suggest', suggestedCount, 'pages');

    // Prepare the content for AI analysis
    const contentForAnalysis = nonCornerstoneContent
      .map(page => `ID: ${page.id}\nTitle: ${page.title}\nURL: ${page.url}\nType: ${page.content_type}`)
      .join('\n\n');

    // Create a prompt for the AI
    const prompt = `You are a content strategist helping to identify key content pages for a website.

Available content:
${contentForAnalysis}

Instructions:
1. Analyze the available content and suggest ONLY business-critical pages that should be marked as key content.
2. IMPORTANT: You MUST filter out these types of pages:
   - Privacy/Policy pages (containing: privacy, policy, gdpr, terms, privatlivspolitik, politik)
   - Transaction pages (containing: payment, checkout, billing, betaling, kurv)
   - System pages (containing: system, technical, error, login, register)
   - Thank you pages
   - Support/documentation pages
   - Blog posts or articles
   - Category/tag pages
   - Archive pages
   - Any page with a number in the title (e.g., "Page 2", "Post 3")

3. You MUST ONLY suggest these types of pages:
   - Homepage/Front page
   - Main product/service pages
   - Core feature pages
   - Pricing pages
   - About/Company pages
   - Contact pages
   - High-value landing pages

4. Return a JSON object with exactly 5 suggestions in this format:
{
  "suggestions": [
    {
      "id": "page_id",
      "reason": "Clear explanation of business value"
    }
  ]
}

5. Each suggestion MUST:
   - Have a valid page ID from the available content
   - Include a clear explanation of business value
   - NOT be in the excluded categories above
   - Focus on business impact and value

6. Before returning, verify each suggestion:
   - Check that the page ID exists in the available content
   - Confirm the page title doesn't contain any excluded terms
   - Ensure the reason focuses on business value
   - Make sure the page represents a core business offering

Return ONLY the JSON object, no other text.`;

    // Get AI suggestions using native fetch
    console.log('Requesting AI suggestions...');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI key available:', !!openaiKey);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a content strategist helping to identify key pages for a website. Provide clear, concise reasoning for your suggestions. Always return raw JSON without any markdown formatting or code blocks. You MUST strictly follow the filtering rules provided.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const completion = await response.json();
      const aiResponse = completion.choices[0].message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      let suggestions;
      try {
        // Clean the response by removing any markdown code blocks if present
        const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
        console.log('Cleaned AI response:', cleanResponse);
        suggestions = JSON.parse(cleanResponse);
        console.log('Successfully parsed AI response:', suggestions);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        console.error('Raw AI response:', aiResponse);
        throw new Error('Failed to parse AI response');
      }

      // Log the available pages for matching
      console.log('Available pages for matching:', nonCornerstoneContent.map(p => ({ id: p.id, title: p.title })));

      // Define exclusion patterns
      const exclusionPatterns = [
        /privacy|policy|gdpr|terms|privatlivspolitik|politik/i,
        /payment|checkout|billing|betaling|kurv/i,
        /system|technical|error|login|register/i,
        /thank you|tak/i,
        /support|documentation|docs/i,
        /blog|article|post/i,
        /category|tag|archive/i,
        /\d+$/  // Matches numbers at the end of titles
      ];

      // Validate and filter suggestions
      const validSuggestions = suggestions.suggestions
        .filter((suggestion: any) => {
          console.log('Checking suggestion:', suggestion);
          const page = nonCornerstoneContent.find(p => p.id === suggestion.id);
          console.log('Found matching page:', page);
          
          if (!page || page.is_cornerstone) {
            console.log('Page not found or already cornerstone:', page);
            return false;
          }

          // Check if page title matches any exclusion patterns
          const isExcluded = exclusionPatterns.some(pattern => pattern.test(page.title));
          if (isExcluded) {
            console.log('Page excluded due to title pattern:', page.title);
            return false;
          }

          return true;
        })
        .slice(0, suggestedCount);

      console.log('Found', validSuggestions.length, 'valid suggestions');
      console.log('Valid suggestions:', validSuggestions);

      return new Response(
        JSON.stringify({
          suggestions: validSuggestions,
          total_pages: totalPages,
          suggested_count: validSuggestions.length,
          debug: {
            raw_response: aiResponse,
            parsed_suggestions: suggestions,
            available_pages: nonCornerstoneContent.map(p => ({ id: p.id, title: p.title }))
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      throw new Error(`OpenAI API error: ${openaiError.message}`);
    }

  } catch (error) {
    console.error('Error in suggest-key-content function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Failed to generate key content suggestions'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 