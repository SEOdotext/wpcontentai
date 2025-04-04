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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-queue-processing, x-original-user-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check if this is a queue processing request
    const isQueueProcessing = req.headers.get('X-Queue-Processing') === 'true';
    console.log('Is queue processing:', isQueueProcessing);
    
    // Create Supabase client with the service role key
    // This ensures we have admin access to the database regardless of the user token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate request body
    const body = await req.json();
    console.log('Request body:', body);
    const { postThemeId } = body;
    
    if (!postThemeId) {
      throw new Error('Missing required field: postThemeId');
    }

    // Get the post theme details from the database
    console.log('Fetching post theme:', postThemeId);
    const { data: postTheme, error: postThemeError } = await supabaseAdmin
      .from('post_themes')
      .select('*')
      .eq('id', postThemeId)
      .single();

    if (postThemeError) {
      console.error('Database error fetching post theme:', postThemeError);
      throw new Error('Failed to fetch post theme from database');
    }

    if (!postTheme) {
      console.error('Post theme not found for ID:', postThemeId);
      throw new Error('Post theme not found');
    }
    
    console.log('Found post theme:', {
      id: postTheme.id,
      subject_matter: postTheme.subject_matter,
      keywords: postTheme.keywords
    });

    // Get publication settings (writing style, template, etc.)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('publication_settings')
      .select('writing_style, subject_matters, wordpress_template')
      .eq('website_id', postTheme.website_id)
      .single();

    if (settingsError) {
      console.error('Error fetching publication settings:', settingsError);
      throw new Error('Failed to fetch publication settings');
    }

    // Get website content for context and cornerstone pages
    const { data: websiteContent, error: contentError } = await supabaseAdmin
      .from('website_content')
      .select('content, title, url, is_cornerstone')
      .eq('website_id', postTheme.website_id)
      .order('is_cornerstone', { ascending: false });

    if (contentError) {
      console.error('Error fetching website content:', contentError);
      throw new Error('Failed to fetch website content');
    }

    // Get website language
    const { data: website, error: websiteError } = await supabaseAdmin
      .from('websites')
      .select('language')
      .eq('id', postTheme.website_id)
      .single();

    if (websiteError) {
      console.error('Error fetching website:', websiteError);
      throw new Error('Failed to fetch website settings');
    }

    const contentLanguage = website?.language || 'en';
    const writingStyle = settings?.writing_style || 'Professional and informative';
    const wordpressTemplate = settings?.wordpress_template;
    const subjectMatters = settings?.subject_matters || [];

    // Get cornerstone content for internal links
    const cornerstoneContent = websiteContent?.filter(content => content.is_cornerstone) || [];

    console.log('Found settings:', {
      hasContent: !!websiteContent?.length,
      contentLength: websiteContent?.length,
      language: contentLanguage,
      hasTemplate: !!wordpressTemplate,
      subjectMatters: subjectMatters.length
    });

    // THIS IS THE FIX - Using our detailed prompt instead of the simplified one
    // Generate content using OpenAI
    const prompt = `Write a high-quality WordPress blog post with the title:
"${postTheme.subject_matter}"

Writing Style: ${writingStyle}
Keywords to include: ${postTheme.keywords.join(', ')}
Language: ${contentLanguage}

Subject Matters to Consider: ${subjectMatters.join(', ')}

Website Content Summary (to reference and link back to where relevant): 
${websiteContent?.[0]?.content?.substring(0, 1500) || ''}

Key content pages to reference (only use if relevant to the content):
${cornerstoneContent.map(content => `- ${content.title}: ${content.url}`).join('\n') || 'No key content pages available'}

The content should:
1. Have an engaging introduction that hooks the reader
2. Include 3-5 main sections with descriptive subheadings
3. Incorporate the keywords naturally throughout the text
4. Include 2-3 internal links to other content on the website (using the provided key content pages)
5. End with a conclusion and call to action
6. Be approximately 800-1200 words

IMPORTANT: 
- DO NOT include the title as an H1 or H2 at the beginning of the article. The title will already be displayed in the WordPress theme.
- DO NOT include post metadata like date, author, categories, or tags.
- DO NOT include phrases like "Posted on", "Posted by", "Posted in", or "Tagged with".
- DO NOT include any headers or footers that would typically be handled by the WordPress theme.
- For Danish content: Do NOT capitalize every word in headers (h2, h3, etc.). Danish headers should only capitalize the first word and proper nouns.
- Start directly with the introduction paragraph.

Format the response as HTML with proper heading tags (h2, h3), paragraphs, lists, and link elements.
Use internal links with anchor text that flows naturally in the content.`;

    // Print the full prompt to logs for debugging
    console.log('FULL PROMPT:', prompt);
    
    // Log actual request parameters in detail
    const openaiRequestBody = {
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a professional blog writer who specializes in creating well-structured HTML content for WordPress. Always format your response with proper HTML tags including <h2>, <h3>, <p>, <ul>, <ol>, <li>, and <blockquote> where appropriate. Never include the title as an H1 or H2 at the beginning of the article. Start directly with the introduction paragraph.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    };
    
    // Double check the final prompt being sent
    console.log('SENDING THIS EXACT PROMPT:', openaiRequestBody.messages[1].content);

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

    // Format the content with proper HTML structure
    let formattedContent = generatedContent
      // Ensure the content starts with a paragraph
      .replace(/^([^<])/m, '<p>$1')
      // Replace numbered lists with proper HTML
      .replace(/(\d+\.\s+.*?)(?=\n\n|\n$|$)/gs, (match) => {
        const items = match.split('\n').map(item => item.replace(/^\d+\.\s+/, ''));
        return `<ol>${items.map(item => `<li>${item}</li>`).join('')}</ol>`;
      })
      // Replace bullet points with proper HTML
      .replace(/([•-]\s+.*?)(?=\n\n|\n$|$)/gs, (match) => {
        const items = match.split('\n').map(item => item.replace(/^[•-]\s+/, ''));
        return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
      })
      // Ensure paragraphs are wrapped in <p> tags
      .split('\n\n')
      .map(para => para.trim())
      .filter(para => para)
      .map(para => {
        if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol') || para.startsWith('<blockquote')) {
          return para;
        }
        return `<p>${para}</p>`;
      })
      .join('\n');

    // Apply WordPress template if available
    let finalContent = formattedContent;
    if (wordpressTemplate) {
      console.log('Applying WordPress template to content');
      // Use string replacement instead of DOM manipulation
      if (wordpressTemplate.includes('.entry-content')) {
        // Replace content between .entry-content tags with our formatted content
        finalContent = wordpressTemplate.replace(
          /<div class="entry-content">([\s\S]*?)<\/div>/,
          `<div class="entry-content">${formattedContent}</div>`
        );
      } else {
        // If no entry-content div is found, just use the formatted content
        finalContent = formattedContent;
      }
    }

    // Update the post theme in the database
    console.log('Updating post theme in database with:', {
      id: postThemeId,
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
      .eq('id', postThemeId)
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