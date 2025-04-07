// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Get allowed origins from environment variables
const ALLOWED_ORIGINS = {
  production: Deno.env.get('ALLOWED_ORIGINS_PROD') ? 
    Deno.env.get('ALLOWED_ORIGINS_PROD')?.split(',') || ['https://contentgardener.ai', 'https://contentgardener.ai/'] : 
    ['https://contentgardener.ai', 'https://contentgardener.ai/'],
  staging: Deno.env.get('ALLOWED_ORIGINS_STAGING') ? 
    Deno.env.get('ALLOWED_ORIGINS_STAGING')?.split(',') || ['https://staging.contentgardener.ai', 'http://localhost:8080'] : 
    ['https://staging.contentgardener.ai', 'http://localhost:8080']
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
    
  // Log for debugging
  console.log(`Checking origin: ${origin}, allowed: ${allowedOrigins.join(', ')}`);
  
  return allowedOrigins.some(allowed => origin.trim() === allowed.trim());
}

// Handle CORS headers generation
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  const allowedOrigin = isAllowedOrigin(origin) ? origin || ALLOWED_ORIGINS.production[0] : ALLOWED_ORIGINS.production[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400' // 24 hours caching of preflight requests
  };
}

interface GeneratePostIdeasRequest {
  website_id: string;
  website_url?: string;
  keywords?: string[];
  writing_style?: string;
  subject_matters?: string[];
  language?: string;
  scraped_content?: { title: string; digest: string }[];
}

interface PostIdea {
  title: string;
  keywords: string[];
  description: string;
  categories: string[];
}

interface GeneratePostIdeasResponse {
  success: boolean;
  titles: string[];
  keywords: string[];
  keywordsByTitle: { [title: string]: string[] };
  categoriesByTitle: { [title: string]: string[] };
  postThemes: { [title: string]: { id: string } };
}

// Helper function to detect if content is likely in Danish
function isDanishContent(text: string): boolean {
  const danishIndicators = [
    'dansk', 'personale', 'arbejdskraft', 'udlejning', 'vikarbureau',
    'rekruttering', 'medarbejdere', 'udenlandsk', 'arbejdsmarked'
  ];
  
  const lowerText = text.toLowerCase();
  return danishIndicators.some(indicator => lowerText.includes(indicator));
}

// Helper function to format Danish titles
function formatDanishTitle(title: string): string {
  const words = title.split(' ');
  return words.map((word, index) => {
    if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    // Capitalize proper nouns
    if (word.length > 3 && word.charAt(0).toUpperCase() === word.charAt(0)) {
      return word;
    }
    return word.toLowerCase();
  }).join(' ');
}

// Helper function to generate focused keywords
function generateFocusedKeywords(title: string, userKeywords: string[], subjectMatters: string[]): string[] {
  const lowerTitle = title.toLowerCase();
  const result: string[] = [];
  
  // 1. Include relevant subject matters
  const relevantSubjects = subjectMatters
    .filter(subject => lowerTitle.includes(subject.toLowerCase()))
    .slice(0, 2);
  
  if (relevantSubjects.length > 0) {
    result.push(...relevantSubjects.map(s => s.replace(/:/g, '').trim()));
  } else {
    const partialMatches = subjectMatters
      .filter(subject => {
        const words = subject.toLowerCase().split(/\s+/);
        return words.some(word => word.length > 3 && lowerTitle.includes(word));
      })
      .slice(0, 2);
    
    if (partialMatches.length > 0) {
      result.push(...partialMatches.map(s => s.replace(/:/g, '').trim()));
    }
  }
  
  // 2. Add relevant user keywords
  const relevantUserKeywords = userKeywords
    .filter(keyword => lowerTitle.includes(keyword.toLowerCase()))
    .slice(0, 2);
  
  if (relevantUserKeywords.length > 0) {
    result.push(...relevantUserKeywords.map(s => s.replace(/:/g, '').trim()));
  }
  
  return result;
}

console.log("Hello from Functions!")

serve(async (req) => {
  // Get CORS headers for this request
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    // Get the request body
    const requestBody = await req.json();
    const { website_id, website_url, keywords = [], writing_style, subject_matters = [], language: requestLanguage = 'en', scraped_content } = requestBody as GeneratePostIdeasRequest;
    
    console.log('------------ GENERATE POST IDEAS REQUEST ------------');
    console.log('Request parameters:', JSON.stringify(requestBody, null, 2));
    console.log(`Website ID: ${website_id}`);
    console.log(`Website URL: ${website_url}`);
    console.log(`Requested Language: ${requestLanguage}`);
    console.log(`Keywords: ${keywords.join(', ')}`);
    console.log('----------------------------------------------------');

    if (!website_id && !website_url) {
      throw new Error('Either website_id or website_url is required');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Flag to indicate if we're in onboarding flow
    const isOnboarding = !!website_url;
    console.log(`Operating in onboarding mode: ${isOnboarding}`);

    // In onboarding mode with missing website_id, generate temporary ones
    const effectiveWebsiteId = website_id || `temp-${Date.now()}`;
    
    // Get website language from database if not in onboarding mode
    let language = requestLanguage;
    if (!isOnboarding && website_id) {
      try {
        const { data: websiteData, error: websiteError } = await supabaseClient
          .from('websites')
          .select('language')
          .eq('id', website_id)
          .single();

        if (websiteError) {
          console.error('Error fetching website language:', websiteError);
        } else if (websiteData?.language) {
          language = websiteData.language;
          console.log(`Using website language from database: ${language}`);
        }
      } catch (error) {
        console.error('Error fetching website data:', error);
      }
    }
    
    // Get publication settings for the website
    let pubSettings = null;
    try {
      // Skip DB lookup completely in onboarding mode - use default settings
      if (isOnboarding) {
        console.log('Using default publication settings for onboarding');
        pubSettings = {
          writing_style: writing_style || 'professional',
          subject_matters: subject_matters.length ? subject_matters : ['general'],
          image_prompt: 'Create a professional blog image'
        };
      } else {
        const { data, error } = await supabaseClient
          .from('publication_settings')
          .select('writing_style, subject_matters, image_prompt')
          .eq('website_id', effectiveWebsiteId)
          .single();

        if (error) {
          console.error('Error fetching publication settings:', error);
          throw new Error('Failed to fetch publication settings');
        } else {
          pubSettings = data;
        }
      }
    } catch (error) {
      console.error('Publication settings error:', error);
      if (isOnboarding) {
        console.log('Using default publication settings after error');
        pubSettings = {
          writing_style: writing_style || 'professional',
          subject_matters: subject_matters.length ? subject_matters : ['general'],
          image_prompt: 'Create a professional blog image'
        };
      } else {
        throw error;
      }
    }

    // Get existing post themes
    let existingPosts = [];
    try {
      const { data, error } = await supabaseClient
        .from('post_themes')
        .select('subject_matter, keywords')
        .eq('website_id', effectiveWebsiteId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching existing posts:', error);
        if (!isOnboarding) {
          throw new Error('Failed to fetch existing posts');
        }
      } else {
        existingPosts = data || [];
      }
    } catch (error) {
      console.error('Existing posts error:', error);
      if (!isOnboarding) {
        throw error;
      }
    }

    // Get website content from sitemap
    let sitemapContent = [];
    try {
      // Handle direct scraped content from onboarding
      if (isOnboarding && scraped_content && Array.isArray(scraped_content)) {
        console.log(`Using ${scraped_content.length} scraped content items from onboarding`);
        
        // Extract digests from scraped content
        sitemapContent = scraped_content.map(item => ({
          title: item.title || 'Untitled',
          content: '', // Skip sending the full content
          digest: item.digest || ''
        }));
        
        console.log('Using digests from scraped content:', sitemapContent.map(item => ({
          title: item.title,
          digest_length: item.digest?.length || 0
        })));
      } else {
        // For non-onboarding, fetch from database
        const { data, error } = await supabaseClient
          .from('website_content')
          .select('title, content, digest')
          .eq('website_id', effectiveWebsiteId)
          .eq('is_cornerstone', true)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching sitemap content:', error);
          if (!isOnboarding) {
            throw new Error('Failed to fetch sitemap content');
          }
        } else {
          sitemapContent = data || [];
        }
      }
    } catch (error) {
      console.error('Sitemap content error:', error);
      if (!isOnboarding) {
        throw error;
      }
    }

    // Get available categories for the website
    let categories = [];
    try {
      const { data, error } = await supabaseClient
        .from('wordpress_categories')
        .select('id, name, description')
        .eq('website_id', effectiveWebsiteId)
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        if (!isOnboarding) {
          throw new Error('Failed to fetch categories');
        }
      } else {
        categories = data || [];
      }
    } catch (error) {
      console.error('Categories error:', error);
      if (!isOnboarding) {
        throw error;
      }
    }

    // Combine all keywords
    const allKeywords = [
      ...keywords,
      ...(pubSettings?.subject_matters || []),
      ...(existingPosts?.flatMap(post => post.keywords || []) || [])
    ];

    // Create a prompt that avoids existing content
    const existingTitles = existingPosts?.map(post => post.subject_matter) || [];
    const existingContent = sitemapContent?.map(content => content.title) || [];
    
    // Format cornerstone content with digests if available
    const cornerstoneContent = sitemapContent?.map(content => {
      if (content.digest) {
        return `${content.title}: ${content.digest}`;
      }
      return content.title;
    }) || [];
    
    // Format categories for the prompt with IDs
    const categoriesList = categories?.map(cat => `${cat.id}: ${cat.name}`).join('\n') || '';

    // Adjust prompt based on language
    console.log(`Creating prompt for language: ${language}`);
    
    // Determine if we're generating Danish content
    const isDanish = language === 'da';
    
    const prompt = `Generate 5 unique blog post ideas for a website, with each post focusing on the following primary keywords:
${keywords.join(', ')}

Each post should:
1. Be centered around these keywords and the keywords should be included in the title
2. Explore different aspects or angles of these topics
3. Provide unique value while maintaining the keyword focus

Additional context:
Current year: 2025
Writing style: ${writing_style || pubSettings?.writing_style || 'professional'}
Subject matters: ${subject_matters.join(', ') || pubSettings?.subject_matters?.join(', ') || 'general'}
Language: ${isDanish ? 'Danish (da)' : 'English (en)'}

Available categories (use category IDs):
${categories?.map(cat => `- ${cat.id}: ${cat.name}`).join('\n') || 'No categories available'}

Avoid these existing topics:
${existingTitles.join('\n')}

Existing cornerstone content (use these as a reference for your suggestions):
${cornerstoneContent.join('\n')}

For each idea, provide:
1. A compelling title that incorporates the keywords naturally
2. 3-5 relevant keywords (avoid using colons in keywords)
3. A brief description (max 50 words - be very concise)
4. Up to 3 most relevant category IDs from the available list above

Important rules:
1. ${isDanish ? 'IMPORTANT: Generate all content in Danish language' : 'Generate all content in English language'}
2. ${isDanish ? 'For Danish titles: Only capitalize the first word and proper nouns' : 'For English titles: Capitalize main words following standard English title case'}
3. Keywords should be category-oriented and domain-specific
4. Avoid generic single words like: ${isDanish ? 'virksomhed, løsning, sammenligning, bedste, tips, pålidelig' : 'business, solution, comparison, best, tips, reliable'}
5. Categories MUST be selected from the provided list only - use category IDs exactly as shown
6. Each post should have 1-3 relevant categories (not more)
7. DO create post ideas that align with the themes in the cornerstone content but offer new perspectives
8. DO NOT use colons in any keywords
9. Category IDs must be valid UUIDs from the provided list - do not modify or format them in any way
10. IMPORTANT: When referring to categories, use ONLY the UUID strings, not objects with id/name properties
11. BE CONCISE - keep descriptions short and simple (max 50 words)

Format your response as pure JSON with NO markdown formatting and this exact structure:
{
  "ideas": [
    {
      "title": "[TITLE]",
      "keywords": ["[KEYWORD1]", "[KEYWORD2]", "[KEYWORD3]"],
      "description": "[DESCRIPTION]",
      "categories": ["[UUID1]", "[UUID2]"]
    }
  ]
}

Notice that the "categories" field contains an array of string UUIDs, not objects. Do not include category names in this array, only the UUIDs exactly as they appear in the available categories list above.`;

    // Log the prompt being sent to OpenAI
    console.log('Prompt being sent to OpenAI:', prompt);

    // Create the OpenAI request payload
    const openaiRequestBody = {
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: isDanish 
            ? 'Du er en professionel indholdsrådgiver, der opretter unikke og engagerende blogindlægsideer på dansk.'
            : 'You are a professional content strategist who creates unique and engaging blog post ideas.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    };

    // Log the full OpenAI request payload
    console.log('OpenAI request payload:', JSON.stringify(openaiRequestBody, null, 2));

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
      },
      body: JSON.stringify(openaiRequestBody)
    });

    if (!openaiResponse.ok) {
      throw new Error('Failed to generate post ideas');
    }

    const openaiData = await openaiResponse.json();
    
    // Log the raw OpenAI response
    console.log('Raw OpenAI response:', JSON.stringify(openaiData, null, 2));
    
    // Extract JSON from markdown code blocks if present
    let content = openaiData.choices[0].message.content;
    console.log('Raw content from OpenAI:', content);
    
    const jsonMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      content = jsonMatch[1];
      console.log('Extracted JSON content:', content);
    }
    
    // Parse the cleaned content with better error handling
    let ideas;
    try {
      ideas = JSON.parse(content);
      console.log('Parsed ideas:', JSON.stringify(ideas, null, 2));
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Content that failed to parse:', content);
      
      // Try to fix incomplete JSON if possible
      if (parseError.message.includes('Unexpected end of JSON input')) {
        try {
          // Check if we can recover by adding closing brackets
          const fixedContent = content + ']}';
          const partialIdeas = JSON.parse(fixedContent);
          if (partialIdeas && partialIdeas.ideas && Array.isArray(partialIdeas.ideas)) {
            console.log('Recovered partial ideas from incomplete JSON');
            ideas = partialIdeas;
          } else {
            throw new Error('Could not recover valid structure from incomplete JSON');
          }
        } catch (recoveryError) {
          console.error('Recovery attempt failed:', recoveryError);
          throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
        }
      } else {
        throw new Error(`Failed to parse OpenAI response as JSON: ${parseError.message}`);
      }
    }
    
    // Validate expected structure
    if (!ideas || !ideas.ideas || !Array.isArray(ideas.ideas)) {
      console.error('Invalid ideas structure:', ideas);
      throw new Error('OpenAI response does not match expected format');
    }

    // Process titles for Danish content and create keywordsByTitle
    const processedTitles: string[] = [];
    const keywordsByTitle: { [title: string]: string[] } = {};
    const categoriesByTitle: { [title: string]: string[] } = {};
    
    // Create a map of category IDs to their full objects for quick lookup
    const categoryMap: { [id: string]: { id: string; name: string } } = {};
    if (categories) {
      categories.forEach(cat => {
        categoryMap[cat.id] = { id: cat.id, name: cat.name };
      });
    }
    
    ideas.ideas.forEach((idea: PostIdea) => {
      // Format the title based on language
      const processedTitle = isDanish ? formatDanishTitle(idea.title) : idea.title;
      processedTitles.push(processedTitle);
      
      // Use the original keywords from the AI response
      keywordsByTitle[processedTitle] = idea.keywords;
      
      // Make sure we NEVER return null or invalid categories
      if (Array.isArray(idea.categories)) {
        // Strictly filter to only include valid UUIDs that exist in the category map
        const validCategories = idea.categories.filter(id => 
          id && 
          typeof id === 'string' && 
          id.trim() !== '' && 
          categoryMap[id.trim()] !== undefined
        ).map(id => id.trim());
        
        categoriesByTitle[processedTitle] = validCategories;
      } else {
        // Always ensure we have an array, even if empty
        categoriesByTitle[processedTitle] = [];
      }
    });

    // Use the first title's keywords as the default set
    const defaultKeywords = keywordsByTitle[processedTitles[0]] || [];

    // Process the ideas and create post themes with categories
    const postThemes: { [title: string]: { id: string } } = {};

    for (const idea of ideas.ideas) {
      // Create post theme with proper array type for keywords
      const { data: postTheme, error: postThemeError } = await supabaseClient
        .from('post_themes')
        .insert({
          website_id: effectiveWebsiteId,
          subject_matter: idea.title,
          keywords: idea.keywords as string[], // Ensure it's treated as an array
          status: 'pending'
        })
        .select()
        .single();

      if (postThemeError) {
        console.error('Error creating post theme:', postThemeError);
        continue;
      }

      // Store the post theme ID for the frontend reference
      postThemes[idea.title] = { id: postTheme.id };

      // Create category associations using the junction table
      if (idea.categories && Array.isArray(idea.categories) && idea.categories.length > 0) {
        // Filter out any invalid category IDs - only keep non-empty strings that exist in the category map
        const validCategoryIds = idea.categories
          .filter((categoryId: string) => 
            categoryId && 
            typeof categoryId === 'string' && 
            categoryId.trim() !== '' && 
            categoryMap[categoryId.trim()] !== undefined
          )
          .map((categoryId: string) => categoryId.trim());
          
        if (validCategoryIds.length > 0) {
          console.log(`Creating category associations for post theme ${postTheme.id}:`, validCategoryIds);
          // Create associations one by one to avoid batch errors
          for (const categoryId of validCategoryIds) {
            const { error: categoryError } = await supabaseClient
              .from('post_theme_categories')
              .insert({
                post_theme_id: postTheme.id,
                wordpress_category_id: categoryId
              });
            
            if (categoryError) {
              console.error(`Error creating category association for ${categoryId}:`, categoryError);
            } else {
              console.log(`Successfully associated category ${categoryId} with post theme ${postTheme.id}`);
            }
          }
        } else {
          console.warn('No valid category IDs found for post theme:', postTheme.id);
        }
      } else {
        console.log('No categories to associate with post theme:', postTheme.id);
      }
    }

    // Log categories for debugging
    console.log('Categories by title to be returned to frontend:', JSON.stringify(categoriesByTitle, null, 2));
    console.log('Post themes to be returned to frontend:', JSON.stringify(postThemes, null, 2));
    
    const result: GeneratePostIdeasResponse = {
      success: true,
      titles: processedTitles,
      keywords: defaultKeywords,
      keywordsByTitle,
      categoriesByTitle,
      postThemes
    };

    // In onboarding mode, just skip the database lookups and use mock data
    if (isOnboarding) {
      console.log("Onboarding mode detected - returning actual generated ideas");
      
      // Check if we have the website_url to work with
      if (!website_url) {
        throw new Error("No website URL provided for onboarding");
      }
      
      // Continue with the actual AI-generated ideas from earlier in the function
      console.log('------------ GENERATE POST IDEAS RESPONSE ------------');
      console.log(`Returning generated ideas for onboarding mode:`, JSON.stringify({ 
        success: true, 
        titles: processedTitles,
        keywords: defaultKeywords,
        keywordsByTitle,
        categoriesByTitle,
        postThemes
      }, null, 2));
      console.log('-----------------------------------------------------');
      
      // Format the response in a way the frontend expects
      const formattedIdeas = processedTitles.map((title, index) => {
        const id = `idea-${Date.now()}-${index+1}`;
        const titleKeywords = keywordsByTitle[title] || defaultKeywords;
        
        // Safely extract domain for the description
        let domain = "your website";
        try {
          if (website_url) {
            const urlWithoutProtocol = website_url.replace(/^https?:\/\//, '');
            const firstSegment = urlWithoutProtocol.split('/')[0] || '';
            domain = firstSegment || "your website";
          }
        } catch (err) {
          console.log('Error extracting domain from URL:', err);
          domain = "your website";
        }
        
        return {
          id,
          title,
          keywords: titleKeywords,
          description: `Content idea for ${domain}.`,
          categories: categoriesByTitle[title] || []
        };
      });
      
      // Return the response with CORS headers
      return new Response(
        JSON.stringify({
          success: true,
          ideas: formattedIdeas
        }),
        { 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200 
        }
      );
    }

    console.log('------------ GENERATE POST IDEAS RESPONSE ------------');
    console.log('Returning ideas response:', JSON.stringify(result, null, 2));
    console.log('-----------------------------------------------------');
    
    // Return the response with CORS headers
    return new Response(
      JSON.stringify(result),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error.message);
    console.log('------------ GENERATE POST IDEAS ERROR ------------');
    console.log('Error details:', error.message);
    console.log('-------------------------------------------------');
    
    // Return error response with CORS headers
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-post-ideas' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
