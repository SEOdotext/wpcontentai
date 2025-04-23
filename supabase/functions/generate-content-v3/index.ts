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

serve(async (req) => {
  console.log('================== FUNCTION ENTRY POINT ==================');
  console.log('Received request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Get the origin from the request
  const origin = req.headers.get('origin');
  console.log('Request origin:', origin);
  
  // Set CORS headers based on origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS.production[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-queue-processing, x-original-user-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  // ALWAYS handle OPTIONS preflight requests immediately, 
  // before any token validation or body parsing
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request immediately');
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    console.log('Starting main function logic...');
    
    // Parse body FIRST to check for onboarding mode
    // This MUST happen before any authorization checks
    let body: any;
    try {
      body = await req.json();
      console.log('Successfully parsed request body:', body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ code: 400, message: 'Invalid request body' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    // Check for onboarding flag BEFORE authorization check
    const isOnboarding = !!body.is_onboarding;
    console.log('Is onboarding mode detected:', isOnboarding);
    
    // TEMPORARILY SKIP ALL JWT VALIDATION FOR TESTING
    console.log('*** TEMPORARILY BYPASSING ALL JWT VALIDATION FOR TESTING ***');
    
    /*
    // ONLY check authorization if NOT in onboarding mode
    if (!isOnboarding) {
      // Check authorization header - only required for non-onboarding requests
      const authHeader = req.headers.get('Authorization');
      if (!authHeader && !req.headers.get('X-Queue-Processing')) {
        console.error('Missing authorization header for non-onboarding request');
        return new Response(
          JSON.stringify({ code: 401, message: 'Missing authorization header' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401
          }
        );
      }
    } else {
      console.log('Onboarding mode detected - bypassing authorization check completely');
    }
    */
    
    // Log all the headers for debugging
    console.log('All request headers:', Object.fromEntries(req.headers.entries()));
    
    // Check if this is a queue processing request
    const isQueueProcessing = req.headers.get('X-Queue-Processing') === 'true';
    console.log('Is queue processing:', isQueueProcessing);
    
    // Create Supabase client with the service role key
    // This ensures we have admin access to the database regardless of the user token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Supabase client created successfully');

    let postTheme, website, settings, websiteContent, cornerstoneContent;
    let contentLanguage = 'en';
    let writingStyle = 'Professional and informative';
    let wordpressTemplate = null;
    let subjectMatters = [];
    
    if (isOnboarding) {
      // In onboarding mode, we use the provided information directly
      console.log('Generating content in onboarding mode with provided data');
      
      if (!body.title || !body.website_url) {
        throw new Error('Missing required fields for onboarding: title and website_url');
      }
      
      // Create a simple post theme object from the request
      postTheme = {
        id: `temp-${Date.now()}`,
        subject_matter: body.title,
        keywords: body.keywords || [],
        website_id: body.website_id || `temp-${Date.now()}`
      };
      
      // Get language from request or use default
      contentLanguage = body.language || 'en';
      
      // Use the provided cornerstone content and scraped content
      cornerstoneContent = body.cornerstone_content || [];
      websiteContent = body.scraped_content || [];
      
      // Log the data we're using
      console.log('Using onboarding data:', {
        title: body.title,
        website_url: body.website_url,
        language: contentLanguage,
        cornerstoneContentCount: cornerstoneContent.length,
        websiteContentCount: websiteContent.length,
        cornerstoneContentSample: cornerstoneContent[0] ? {
          title: cornerstoneContent[0].title,
          url: cornerstoneContent[0].url,
          hasContent: !!cornerstoneContent[0].content,
          hasDigest: !!cornerstoneContent[0].digest
        } : null,
        websiteContentSample: websiteContent[0] ? {
          title: websiteContent[0].title,
          url: websiteContent[0].url,
          hasContent: !!websiteContent[0].content,
          hasDigest: !!websiteContent[0].digest
        } : null
      });

      // Validate the content format
      const validateContent = (content: any[]) => {
        return content.every(item => 
          typeof item === 'object' &&
          typeof item.title === 'string' &&
          typeof item.url === 'string' &&
          (item.content === undefined || typeof item.content === 'string') &&
          (item.digest === undefined || typeof item.digest === 'string')
        );
      };

      if (!validateContent(cornerstoneContent)) {
        console.error('Invalid cornerstone content format:', cornerstoneContent);
        throw new Error('Invalid cornerstone content format');
      }

      if (!validateContent(websiteContent)) {
        console.error('Invalid website content format:', websiteContent);
        throw new Error('Invalid website content format');
      }
    } else {
      // Regular flow - validate postThemeId
      const { postThemeId, websiteId: passedWebsiteId } = body;
      
      if (!postThemeId) {
        throw new Error('Missing required field: postThemeId');
      }

      // Get the post theme details from the database
      console.log('Fetching post theme:', postThemeId);
      const { data: fetchedTheme, error: postThemeError } = await supabaseAdmin
        .from('post_themes')
        .select('*')
        .eq('id', postThemeId)
        .single();

      if (postThemeError) {
        console.error('Database error fetching post theme:', postThemeError);
        throw new Error('Failed to fetch post theme from database');
      }

      if (!fetchedTheme) {
        console.error('Post theme not found for ID:', postThemeId);
        throw new Error('Post theme not found');
      }
      
      postTheme = fetchedTheme;
      
      // If websiteId was explicitly passed, use it (overriding the one from postTheme)
      // This helps ensure we're using the correct website ID
      const effectiveWebsiteId = passedWebsiteId || postTheme.website_id;
      
      console.log('Found post theme:', {
        id: postTheme.id,
        subject_matter: postTheme.subject_matter,
        keywords: postTheme.keywords,
        storedWebsiteId: postTheme.website_id,
        passedWebsiteId,
        effectiveWebsiteId
      });

      // Get publication settings (writing style, template, etc.)
      const { data: fetchedSettings, error: settingsError } = await supabaseAdmin
        .from('publication_settings')
        .select('writing_style, subject_matters, wordpress_template')
        .eq('website_id', effectiveWebsiteId)
        .single();

      if (settingsError) {
        console.error('Error fetching publication settings:', settingsError);
        console.log('Using default publication settings instead for website ID:', effectiveWebsiteId);
        
        // Use default settings instead of throwing error
        settings = {
          writing_style: 'Professional and informative',
          subject_matters: [],
          wordpress_template: null
        };
      } else {
        settings = fetchedSettings;
      }

      // Get website content for context and cornerstone pages
      const { data: fetchedContent, error: contentError } = await supabaseAdmin
        .from('website_content')
        .select('content, title, url, is_cornerstone')
        .eq('website_id', effectiveWebsiteId)
        .order('is_cornerstone', { ascending: false });

      if (contentError) {
        console.error('Error fetching website content:', contentError);
        console.log('Using empty website content array for website ID:', effectiveWebsiteId);
        
        // Use empty content array instead of throwing error
        websiteContent = [];
      } else {
        websiteContent = fetchedContent;
      }

      // Get website language
      const { data: fetchedWebsite, error: websiteError } = await supabaseAdmin
        .from('websites')
        .select('language')
        .eq('id', effectiveWebsiteId)
        .single();

      if (websiteError) {
        console.error('Error fetching website:', websiteError);
        console.log('Using default language (en) for website ID:', effectiveWebsiteId);
        
        // Use default website settings instead of throwing error
        website = {
          language: 'en'
        };
      } else {
        website = fetchedWebsite;
      }

      contentLanguage = website?.language || 'en';
      writingStyle = settings?.writing_style || 'Professional and informative';
      wordpressTemplate = settings?.wordpress_template;
      subjectMatters = settings?.subject_matters || [];

      // Get cornerstone content for internal links
      cornerstoneContent = websiteContent?.filter(content => content.is_cornerstone) || [];
    }

    // Prepare the content context with exact URLs
    const availableLinks = cornerstoneContent
      .slice(0, 3) // Only use up to 3 cornerstone pages for context
      .map(content => `<a href="${content.url}">${content.title}</a>`);

    console.log('Available links for content:', availableLinks);

    // Prepare formatting instructions based on mode
    let formattingInstructions = '';
    if (isOnboarding) {
      formattingInstructions = `HTML FORMATTING REQUIREMENTS:
- DO NOT include the headline/title in the HTML content - it will be added separately
- Wrap each paragraph in <p> tags
- Use <h2> for main section headers
- Use <h3> for subsection headers if needed
- Use <ul> and <li> for unordered lists
- Use <ol> and <li> for ordered lists
- Use <blockquote> for quotes
- NEVER use code blocks, backticks (\`\`\`), or any code formatting
- DO NOT include extra newlines between elements
- Ensure all HTML tags are properly closed
- Format lists properly with each <li> on its own line`;
    } else if (wordpressTemplate) {
      formattingInstructions = `WORDPRESS TEMPLATE FORMAT:
Use this exact HTML structure for your content:
${wordpressTemplate}

Replace the content between the entry-content tags with your generated content.
Ensure your content matches the styling and structure of the template.
DO NOT include the headline/title in the content - it will be added separately.`;
    } else {
      // Default formatting for non-onboarding without template
      formattingInstructions = `HTML FORMATTING REQUIREMENTS:
- DO NOT include the headline/title in the HTML content - it will be added separately
- Wrap each paragraph in <p> tags
- Use <h2> for main section headers
- Use <h3> for subsection headers if needed
- Use <ul> and <li> for unordered lists
- Use <ol> and <li> for ordered lists
- Use <blockquote> for quotes
- NEVER use code blocks, backticks (\`\`\`), or any code formatting
- DO NOT include extra newlines between elements
- Ensure all HTML tags are properly closed
- Format lists properly with each <li> on its own line`;
    }

    const prompt = `Write a high-quality WordPress blog post with the title:
"${postTheme.subject_matter}"

Writing Style: ${writingStyle}
Keywords to include: ${postTheme.keywords.join(', ')}
Language: ${contentLanguage}

Subject Matters to Consider: ${subjectMatters.join(', ')}

Website Content Summary (to reference and link back to where relevant): 
${websiteContent?.[0]?.content?.substring(0, 1500) || ''}

Available links for reference (use these where relevant):
${availableLinks.map((link, i) => `${i + 1}. ${link}`).join('\n')}

Content Requirements:
1. Have an engaging introduction that hooks the reader
2. Include 3-5 main sections with descriptive subheadings
3. Incorporate the keywords naturally throughout the text
4. End with a conclusion
5. Be approximately 800-1200 words

${formattingInstructions}

For Danish content: Only capitalize first word and proper nouns in headers`;

    // Print the full prompt to logs for debugging
    console.log('FULL PROMPT:', prompt);
    
    // Log actual request parameters in detail
    const openaiRequestBody = {
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a professional blog writer who specializes in creating well-structured HTML content for WordPress. You must use the exact links provided in the prompt by copying and pasting them. Never modify URLs or create placeholder links. Format your content exactly as specified in the formatting instructions. IMPORTANT: Do not wrap your content in markdown code blocks (```) or use any markdown formatting. Return pure HTML content only.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    };

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found');
    }
    console.log('OpenAI API key available:', !!openaiApiKey);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openaiRequestBody)
    });

    console.log('OpenAI API response status:', openaiResponse.status);
    console.log('OpenAI API response headers:', Object.fromEntries(openaiResponse.headers.entries()));

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => null);
      console.error('OpenAI API Error Response:', errorData);
      console.error('OpenAI API Error Status:', openaiResponse.status);
      console.error('OpenAI API Error Status Text:', openaiResponse.statusText);
      
      let errorMessage = 'Failed to generate content with OpenAI';
      if (errorData?.error?.message) {
        errorMessage = `OpenAI API Error: ${errorData.error.message}`;
      } else if (openaiResponse.status === 401) {
        errorMessage = 'Invalid OpenAI API key';
      } else if (openaiResponse.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded';
      } else if (openaiResponse.status === 503) {
        errorMessage = 'OpenAI API service unavailable';
      }
      
      throw new Error(errorMessage);
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI API response data:', openaiData);
    console.log('OpenAI response message:', openaiData.choices?.[0]?.message);
    console.log('OpenAI content first 200 chars:', openaiData.choices?.[0]?.message?.content?.substring(0, 200));

    if (!openaiData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    const generatedContent = openaiData.choices[0].message.content;
    console.log('Generated content length:', generatedContent.length);

    // Use the content directly without additional formatting
    const finalContent = generatedContent;

    // Update the post theme in the database
    console.log('Content generation completed with final content length:', finalContent.length);
    
    // In onboarding mode, return the content directly
    if (isOnboarding) {
      console.log('Onboarding mode: Returning generated content directly');
      return new Response(
        JSON.stringify({ 
          success: true, 
          content: finalContent,
          title: postTheme.subject_matter
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // For regular mode, update the database
    console.log('Updating post theme in database with:', {
      id: postTheme.id,
      updates: {
        post_content: finalContent.substring(0, 100) + '...', // Log first 100 chars
        status: 'generated',
        updated_at: new Date().toISOString()
      }
    });

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('post_themes')
      .update({
        post_content: finalContent,
        status: 'generated',
        updated_at: new Date().toISOString()
      })
      .eq('id', postTheme.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating post theme:', updateError);
      throw new Error('Failed to update post theme in database');
    }

    console.log('Successfully updated post theme:', {
      id: updateData.id,
      status: updateData.status,
      hasContent: !!updateData.post_content,
      contentLength: updateData.post_content?.length,
      updatedAt: updateData.updated_at
    });

    console.log('Successfully generated and saved content');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-content-v3 function:', error);
    console.error('Error stack:', error.stack);
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