// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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

// Get the origin
const origin = typeof Request !== 'undefined' ? new Request('').headers.get('origin') : null;

const corsHeaders = {
  'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS.production[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface GeneratePostIdeasRequest {
  website_id: string;
  keywords?: string[];
  writing_style?: string;
  subject_matters?: string[];
}

interface PostIdea {
  title: string;
  keywords: string[];
  description: string;
  categories: string[];
}

interface GeneratePostIdeasResponse {
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { website_id, keywords = [], writing_style, subject_matters = [] } = await req.json() as GeneratePostIdeasRequest;

    if (!website_id) {
      throw new Error('website_id is required');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get publication settings for the website
    const { data: pubSettings, error: pubSettingsError } = await supabaseClient
      .from('publication_settings')
      .select('writing_style, subject_matters, image_prompt')
      .eq('website_id', website_id)
      .single();

    if (pubSettingsError) {
      console.error('Error fetching publication settings:', pubSettingsError);
      throw new Error('Failed to fetch publication settings');
    }

    // Get existing post themes
    const { data: existingPosts, error: postsError } = await supabaseClient
      .from('post_themes')
      .select('subject_matter, keywords')
      .eq('website_id', website_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (postsError) {
      console.error('Error fetching existing posts:', postsError);
      throw new Error('Failed to fetch existing posts');
    }

    // Get website content from sitemap
    const { data: sitemapContent, error: sitemapError } = await supabaseClient
      .from('website_content')
      .select('title, content')
      .eq('website_id', website_id)
      .eq('is_cornerstone', true)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (sitemapError) {
      console.error('Error fetching sitemap content:', sitemapError);
      throw new Error('Failed to fetch sitemap content');
    }

    // Get available categories for the website
    const { data: categories, error: categoriesError } = await supabaseClient
      .from('wordpress_categories')
      .select('id, name, description')
      .eq('website_id', website_id)
      .order('name');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      throw new Error('Failed to fetch categories');
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
    
    // Format categories for the prompt with IDs
    const categoriesList = categories?.map(cat => `${cat.id}: ${cat.name}`).join('\n') || '';

    const prompt = `Generate 5 unique blog post ideas for a website, with each post focusing on the following primary keywords:
${keywords.join(', ')}

Each post should:
1. Be centered around these keywords and the keywords should be included in the title
2. Explore different aspects or angles of these topics
3. Provide unique value while maintaining the keyword focus

Additional context:
Writing style: ${writing_style || pubSettings?.writing_style || 'professional'}
Subject matters: ${subject_matters.join(', ') || pubSettings?.subject_matters?.join(', ') || 'general'}

Available categories (use category IDs):
${categories?.map(cat => `- ${cat.id}: ${cat.name}`).join('\n') || 'No categories available'}

Avoid these existing topics:
${existingTitles.join('\n')}

And these existing cornerstone content:
${existingContent.join('\n')}

For each idea, provide:
1. A compelling title that incorporates the keywords naturally
2. 3-5 relevant keywords (avoid using colons in keywords)
3. A brief description (max 50 words - be very concise)
4. Up to 3 most relevant category IDs from the available list above

Important rules:
1. For Danish titles: Only capitalize the first word and proper nouns
2. For English titles: Capitalize main words following standard English title case
3. Keywords should be category-oriented and domain-specific
4. Avoid generic single words like: virksomhed, løsning, sammenligning, bedste, tips, pålidelig
5. Categories MUST be selected from the provided list only - use category IDs exactly as shown
6. Each post should have 1-3 relevant categories (not more)
7. Do NOT use colons in any keywords
8. Category IDs must be valid UUIDs from the provided list - do not modify or format them in any way
9. IMPORTANT: When referring to categories, use ONLY the UUID strings, not objects with id/name properties
10. BE CONCISE - keep descriptions short and simple (max 50 words)

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

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a professional content strategist who creates unique and engaging blog post ideas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      })
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
      const isDanish = isDanishContent(idea.title);
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
          website_id,
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
    
    return new Response(
      JSON.stringify({
        success: true,
        titles: processedTitles,
        keywords: defaultKeywords,
        keywordsByTitle,
        categoriesByTitle,
        postThemes
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in generate-post-ideas:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
