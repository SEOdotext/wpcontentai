import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin || ALLOWED_ORIGINS.production[0] : ALLOWED_ORIGINS.production[0],
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
    const requestBody = await req.json();
    const { website_id, website_url } = requestBody;
    
    console.log('------------ SUGGEST KEY CONTENT REQUEST ------------');
    console.log('Request parameters:', JSON.stringify(requestBody, null, 2));
    console.log('Processing request for website_id:', website_id);
    console.log('Website URL provided:', website_url);
    console.log('----------------------------------------------------');

    if (!website_id && !website_url) {
      throw new Error('Either website_id or website_url is required');
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

    // Flag to indicate onboarding mode
    const isOnboarding = !!website_url;
    console.log('Operating in onboarding mode:', isOnboarding);

    // Fetch website content
    console.log(`Fetching website content for website_id: ${website_id}, in onboarding mode: ${isOnboarding}`);
    
    let content: WebsiteContent[] = [];
    let contentError = null;
    
    if (isOnboarding) {
      // In onboarding mode, check if the request contains sitemap pages or try to fetch them
      console.log('Onboarding mode: Looking for sitemap pages in request or getting them');
      
      // Check if the request has sitemap_pages or pages data
      if (requestBody.sitemap_pages) {
        content = requestBody.sitemap_pages;
        console.log(`Using ${content.length} sitemap pages provided in request`);
      } else if (requestBody.pages) {
        content = requestBody.pages;
        console.log(`Using ${content.length} pages provided in request`);
      } else {
        // If no sitemap pages in request, fetch from sitemap directly
        try {
          console.log(`No pages provided in request, getting sitemap for ${website_url}`);
          const sitemapResponse = await fetch(`${supabaseUrl}/functions/v1/get-sitemap-pages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              website_id: website_id,
              website_url: website_url
            })
          });
          
          if (!sitemapResponse.ok) {
            throw new Error(`Failed to fetch sitemap: ${sitemapResponse.statusText}`);
          }
          
          const sitemapData = await sitemapResponse.json();
          if (sitemapData.pages && sitemapData.pages.length > 0) {
            content = sitemapData.pages.map((page: any) => ({
              id: page.id || `page-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              title: page.title || page.url,
              url: page.url,
              content_type: 'page',
              is_cornerstone: false
            }));
            console.log(`Retrieved ${content.length} pages from sitemap`);
          } else {
            throw new Error('No pages found in sitemap');
          }
        } catch (error: any) {
          console.error('Failed to get sitemap:', error);
          contentError = {
            message: error.message || 'Unknown error retrieving sitemap'
          };
        }
      }
    } else {
      // Regular mode - get content from database
      const result = await supabaseClient
        .from('website_content')
        .select('id, title, url, content_type, is_cornerstone')
        .eq('website_id', website_id)
        .order('created_at', { ascending: true });
      
      content = result.data || [];
      contentError = result.error;
    }
    
    console.log('Content fetch result details:');
    console.log('- Found pages:', content ? content.length : 0);
    console.log('- Error:', contentError ? contentError.message : 'None');
    
    if (content && content.length > 0) {
      // Log some sample URLs to help debug
      console.log('Sample page URLs from content:');
      for (let i = 0; i < Math.min(content.length, 5); i++) {
        const page = content[i];
        console.log(`- Page ${i+1}: ${page.url} (${page.title || 'No title'})`);
      }
    }

    // Handle content fetch errors
    if (contentError && !isOnboarding) {
      console.error('Error fetching content:', contentError);
      throw new Error(`Failed to fetch content: ${contentError.message}`);
    } else if (contentError && isOnboarding) {
      console.error('Error fetching content in onboarding mode:', contentError);
      // In onboarding, if we can't get the pages, return a specific error
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch sitemap',
          message: 'Could not retrieve pages from the website sitemap.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ONBOARDING MODE: During onboarding, we should still suggest pages even if less than 10 pages
    if (!content || (content.length < 10 && !isOnboarding)) {
      console.log('Not enough content:', content?.length || 0, 'pages');
      console.log('Is onboarding mode:', isOnboarding);
      
      if (isOnboarding && content && content.length > 0) {
        console.log('Proceeding with onboarding mode despite having fewer than 10 pages');
        // Continue with whatever pages we have for onboarding
      } else {
        // Don't use mock data - return a clear error
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
    }

    // In onboarding mode, don't filter out cornerstone pages - we want to use whatever is available
    let pagesToAnalyze = [];
    
    if (isOnboarding) {
      // For onboarding, use all available pages
      pagesToAnalyze = content || [];
      console.log(`Onboarding mode: Using all ${pagesToAnalyze.length} available pages without filtering cornerstone status`);
    } else {
      // For normal mode, filter out pages that are already marked as cornerstone
      pagesToAnalyze = content.filter(page => !page.is_cornerstone);
      console.log('Found', pagesToAnalyze.length, 'non-cornerstone pages');
    }

    if (pagesToAnalyze.length === 0) {
      console.log('No available content to suggest - all pages are already cornerstone or no pages available');
      
      // No content available - return an error instead of fake pages
      return new Response(
        JSON.stringify({
          error: 'No available content',
          message: 'No pages were found in the sitemap for analysis.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Calculate how many pages to suggest
    const totalPages = pagesToAnalyze.length;
    // For onboarding, suggest up to 5 pages max; for normal, use 20% up to 10
    const suggestedCount = isOnboarding 
      ? Math.min(5, totalPages)
      : Math.min(Math.ceil(totalPages * 0.2), 10);
      
    console.log(`Will suggest ${suggestedCount} pages out of ${totalPages} total`);

    // Always use AI to suggest pages, even in onboarding mode
    console.log('Using AI to select the most important pages');

    // For non-onboarding mode, use AI to suggest pages
    // Prepare the content for AI analysis
    const contentForAnalysis = pagesToAnalyze
      .map(page => {
        // Normalize URL by removing trailing slash
        const normalizedUrl = page.url.replace(/\/$/, '');
        return `ID: ${page.id}\nTitle: ${page.title}\nURL: ${normalizedUrl}\nType: ${page.content_type}`;
      })
      .join('\n\n');

    // Create a prompt for the AI
    const prompt = `You are a content strategist helping to identify key content pages for a website.

Available content:
${contentForAnalysis}

Instructions:
1. Analyze the available content and suggest the most important pages that should be marked as key content.
2. Focus on pages that:
   - Are central to the website's purpose and value proposition
   - Provide significant value to visitors
   - Demonstrate expertise in key subject areas
   - Have lasting relevance and importance
   - Represent core topics or themes
   - Drive business goals and objectives

3. Return a JSON object with up to 5 suggestions in this format:
{
  "suggestions": [
    {
      "id": "page_id",
      "reason": "Brief explanation of why this page is important"
    },
    {
      "id": "page_id",
      "reason": "Brief explanation of why this page is important"
    }
  ]
}

4. IMPORTANT FORMAT RULES:
   - The response must be valid JSON
   - Return as many suggestions as you find valuable (1-5)
   - Each suggestion must have exactly two fields: "id" and "reason"
   - The "id" must match one of the page IDs from the available content
   - The "reason" should be a brief explanation of why this page is important
   - Do not include any additional fields
   - Do not include any markdown formatting
   - Do not include any explanatory text outside the JSON
   - Only suggest pages that are truly valuable and relevant
   - Do not suggest duplicate or similar pages
   - Do not suggest system pages, email protection pages, or other non-content pages

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
          model: 'gpt-4o',
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
          max_tokens: 2000,
          response_format: { type: "json_object" }
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

      // Validate and filter suggestions
      const validSuggestions = suggestions.suggestions
        .filter((suggestion: any) => {
          console.log('Checking suggestion:', suggestion);
          const page = pagesToAnalyze.find(p => p.id === suggestion.id);
          console.log('Found matching page:', page);
          
          if (!page || page.is_cornerstone) {
            console.log('Page not found or already cornerstone:', page);
            return false;
          }

          // Include the URL and title from the page in the suggestion
          suggestion.url = page.url;
          suggestion.title = page.title || 'Untitled Page';

          return true;
        })
        .slice(0, suggestedCount); // Use the calculated suggestedCount instead of hardcoded 5
        
      // Ensure we don't have duplicate URLs in the suggestions
      const uniqueURLs = new Set<string>();
      const uniqueSuggestions = validSuggestions.filter((suggestion: any) => {
        if (!suggestion.url) return false;
        
        // Normalize URL by removing trailing slash
        const normalizedUrl = suggestion.url.replace(/\/$/, '');
        
        // If we've already seen this URL, filter it out
        if (uniqueURLs.has(normalizedUrl)) {
          console.log(`Filtering out duplicate URL: ${suggestion.url}`);
          return false;
        }
        
        // Otherwise, add it to our set and keep it
        uniqueURLs.add(normalizedUrl);
        return true;
      });
      
      console.log('Found', uniqueSuggestions.length, 'unique suggestions after removing duplicates');
      console.log('Unique suggestions:', uniqueSuggestions);

      // If we have no valid suggestions, return an error
      if (uniqueSuggestions.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'No valid suggestions',
            message: 'Could not find any valid pages to suggest as key content.'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          suggestions: uniqueSuggestions,
          total_pages: totalPages,
          suggested_count: uniqueSuggestions.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error.message}`);
    }

  } catch (error: any) {
    console.error('Error in suggest-key-content function:', error);
    console.log('------------ SUGGEST KEY CONTENT ERROR ------------');
    console.log('Error details:', error.message || 'Unknown error');
    console.log('---------------------------------------------------');
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        message: 'Failed to generate key content suggestions'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 