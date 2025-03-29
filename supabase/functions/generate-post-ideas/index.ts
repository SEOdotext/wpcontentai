// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

interface GeneratePostIdeasRequest {
  website_id: string;
  keywords?: string[];
  writing_style?: string;
  subject_matters?: string[];
}

interface PostIdea {
  title: string;
  keywords: string[];
  categories: string[];
}

interface GeneratePostIdeasResponse {
  titles: string[];
  keywords: string[];
  keywordsByTitle: { [title: string]: string[] };
}

// Helper function to detect if content is likely in Danish
function isDanishContent(text: string, websiteLanguage: string = 'en'): boolean {
  return websiteLanguage === 'da';
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
    result.push(...relevantSubjects);
  } else {
    const partialMatches = subjectMatters
      .filter(subject => {
        const words = subject.toLowerCase().split(/\s+/);
        return words.some(word => word.length > 3 && lowerTitle.includes(word));
      })
      .slice(0, 2);
    
    if (partialMatches.length > 0) {
      result.push(...partialMatches);
    }
  }
  
  // 2. Add relevant user keywords only if they exist
  if (userKeywords && userKeywords.length > 0) {
    const relevantUserKeywords = userKeywords
      .filter(keyword => lowerTitle.includes(keyword.toLowerCase()))
      .slice(0, 2);
    
    if (relevantUserKeywords.length > 0) {
      result.push(...relevantUserKeywords);
    }
  }
  
  // 3. Extract key phrases from the title if no other keywords were found
  if (result.length === 0) {
    const titleWords = lowerTitle.split(/\s+/).filter(w => w.length > 3);
    if (titleWords.length > 0) {
      result.push(...titleWords.slice(0, 2));
    }
  }
  
  return result;
}

console.log("Hello from Functions!")

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
      .select('subject_matter, keywords, categories')
      .eq('website_id', website_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (postsError) {
      console.error('Error fetching existing posts:', postsError);
      throw new Error('Failed to fetch existing posts');
    }

    // Get existing WordPress categories for the website
    const { data: wpCategories, error: wpCategoriesError } = await supabaseClient
      .from('wordpress_categories')
      .select('name, description')
      .eq('website_id', website_id);

    if (wpCategoriesError) {
      console.error('Error fetching WordPress categories:', wpCategoriesError);
      throw new Error('Failed to fetch WordPress categories');
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

    // Get website language
    const { data: website, error: websiteError } = await supabaseClient
      .from('websites')
      .select('language')
      .eq('id', website_id)
      .single();

    if (websiteError) {
      console.error('Error fetching website:', websiteError);
      throw new Error('Failed to fetch website');
    }

    // Combine all keywords
    const allKeywords = [
      ...keywords,
      ...(pubSettings?.subject_matters || []),
      ...(existingPosts?.flatMap(post => post.keywords || []) || [])
    ];

    // Extract all existing categories from posts
    const existingCategories = wpCategories?.map(cat => cat.name) || [];
    
    // Use only existing categories, no defaults
    const categoriesToUse = existingCategories;

    // Create a prompt that avoids existing content
    const existingTitles = existingPosts?.map(post => post.subject_matter) || [];
    const existingContent = sitemapContent?.map(content => content.title) || [];

    const prompt = `Generate 5 unique blog post ideas for a website. Consider the following:

Keywords to include: ${allKeywords.join(', ')}
Writing style: ${writing_style || pubSettings?.writing_style || 'professional'}
Subject matters: ${subject_matters.join(', ') || pubSettings?.subject_matters?.join(', ') || 'general'}
Language: ${website?.language || 'en'}

Avoid these existing topics:
${existingTitles.join('\n')}

And these existing cornerstone content:
${existingContent.join('\n')}

For each idea, provide:
1. A compelling title that directly relates to the website's content and purpose
2. 3-5 relevant keywords that are specific to the website's domain
3. Assign 1-3 categories from the following existing WordPress categories. Do not create new categories:
${categoriesToUse.join(', ')}

Important rules:
1. For Danish titles: Only capitalize the first word and proper nouns
2. For English titles: Capitalize main words following standard English title case
3. Keywords should be specific to the website's domain and content
4. Avoid generic terms and focus on the website's specific niche
5. Only use the existing categories provided above. Do not create new categories.
6. Titles should be specific to the website's content and avoid generic marketing terms
7. Focus on the website's actual products, services, or expertise
8. DO NOT use generic terms like: digital, technology, marketing, SEO, WordPress, content, online, strategy
9. DO NOT use categories that are not in the provided list
10. Keywords must be specific to the website's actual content and purpose

Format the response as JSON with this structure:
{
  "ideas": [
    {
      "title": "",
      "keywords": [],
      "categories": []
    }
  ]
}`;

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
            content: 'You are a professional content strategist who creates unique and engaging blog post ideas. You focus on the specific content and purpose of each website, avoiding generic terms and categories.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!openaiResponse.ok) {
      throw new Error('Failed to generate post ideas');
    }

    const openaiData = await openaiResponse.json();
    
    // Extract JSON from markdown code blocks if present
    let content = openaiData.choices[0].message.content;
    
    // Better handling of potential JSON formatting from OpenAI
    let jsonData;
    try {
      // First, try to parse content directly
      jsonData = JSON.parse(content);
    } catch (e) {
      // If direct parsing fails, try to extract JSON from code blocks
      try {
        const jsonMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonData = JSON.parse(jsonMatch[1]);
        } else {
          // If no code block, remove any backticks and try again
          const cleanedContent = content.replace(/```json|```/g, '').trim();
          jsonData = JSON.parse(cleanedContent);
        }
      } catch (innerError) {
        console.error('Failed to parse JSON after cleaning:', innerError);
        throw new Error('Invalid JSON response from OpenAI');
      }
    }
    
    // Process titles for Danish content and create keywordsByTitle
    const processedTitles: string[] = [];
    const keywordsByTitle: { [title: string]: string[] } = {};
    const categoriesByTitle: { [title: string]: string[] } = {};
    
    jsonData.ideas.forEach((idea: PostIdea) => {
      const isDanish = isDanishContent(idea.title, website?.language);
      const processedTitle = isDanish ? formatDanishTitle(idea.title) : idea.title;
      processedTitles.push(processedTitle);
      keywordsByTitle[processedTitle] = generateFocusedKeywords(processedTitle, idea.keywords, subject_matters);
      categoriesByTitle[processedTitle] = idea.categories;
    });

    // Use the first title's keywords as the default set
    const defaultKeywords = keywordsByTitle[processedTitles[0]] || [];
    const defaultCategories = categoriesByTitle[processedTitles[0]] || [];

    return new Response(
      JSON.stringify({
        success: true,
        titles: processedTitles,
        keywords: defaultKeywords,
        keywordsByTitle,
        categories: defaultCategories,
        categoriesByTitle
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
