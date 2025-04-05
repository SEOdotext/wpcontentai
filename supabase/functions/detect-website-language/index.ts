import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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

// Function to detect language from HTML content
async function detectLanguage(html: string, title: string, content: string): Promise<string> {
  try {
    console.log('Detecting language from page content');
    
    // Try to get language from HTML lang attribute first
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (doc) {
      const htmlElement = doc.querySelector('html');
      if (htmlElement && htmlElement.getAttribute('lang')) {
        const htmlLang = htmlElement.getAttribute('lang').trim().toLowerCase();
        // If lang attribute contains a valid language code, return it
        if (htmlLang && htmlLang.length > 1) {
          // Extract main language code (e.g., 'en-US' becomes 'en')
          const mainLang = htmlLang.split('-')[0];
          console.log(`Language detected from HTML lang attribute: ${mainLang}`);
          return mainLang;
        }
      }

      // Try meta tags as a second option
      const metaLanguage = doc.querySelector('meta[http-equiv="content-language"]');
      if (metaLanguage && metaLanguage.getAttribute('content')) {
        const metaLang = metaLanguage.getAttribute('content').trim().toLowerCase();
        if (metaLang && metaLang.length > 1) {
          const mainLang = metaLang.split('-')[0];
          console.log(`Language detected from meta tag: ${mainLang}`);
          return mainLang;
        }
      }
    }
    
    // If we couldn't get language from HTML attributes, use content analysis with OpenAI
    console.log('No language attributes found in HTML, using content analysis for language detection');
    
    // Prepare content for analysis - use title and a snippet of content
    let textForAnalysis = title || '';
    if (content && content.length > 0) {
      // Add some content if available, limited to a reasonable size
      textForAnalysis += '\n\n' + content.substring(0, 1000);
    }
    
    // If we have no text to analyze, return empty
    if (!textForAnalysis || textForAnalysis.trim().length < 10) {
      console.log('Not enough text for language detection');
      return '';
    }
    
    // Call OpenAI API for language detection
    const openaiRequestBody = {
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a language detection specialist. Respond with a two-letter ISO language code only (e.g., "en" for English, "da" for Danish, "de" for German, etc).'
        },
        { 
          role: 'user', 
          content: `Detect the language of this text and respond with only the two-letter ISO language code:\n\n${textForAnalysis}`
        }
      ],
      temperature: 0.3,
      max_tokens: 10
    };
    
    console.log('Calling OpenAI for language detection');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
      },
      body: JSON.stringify(openaiRequestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error for language detection: ${response.status} ${errorText}`);
      return ''; // Return empty string on error
    }
    
    const data = await response.json();
    
    // Extract the language code
    let detectedLang = data.choices[0].message.content.trim().toLowerCase();
    
    // Ensure we have a clean two-letter code
    detectedLang = detectedLang.replace(/[^a-z]/g, '');
    
    // Validate the language code (basic validation for common languages)
    const validLanguages = ['en', 'da', 'de', 'es', 'fr', 'it', 'nl', 'pt', 'sv', 'no', 'fi', 'ru', 'ja', 'zh', 'ko', 'ar', 'hi', 'bn', 'pa', 'te', 'mr', 'ta', 'ur', 'fa', 'ps'];
    
    if (detectedLang.length !== 2 || !validLanguages.includes(detectedLang)) {
      console.log(`Invalid language code detected: "${detectedLang}", defaulting to "en"`);
      return 'en'; // Default to English for invalid codes
    }
    
    console.log(`Language detected from content analysis: ${detectedLang}`);
    return detectedLang;
  } catch (error) {
    console.error('Error detecting language:', error);
    return ''; // Return empty string if language detection fails
  }
}

// Function to extract text content from HTML
function extractTextFromHtml(html: string): string {
  try {
    // Create a DOM parser
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc) return '';

    // Remove unwanted elements
    const elementsToRemove = [
      'script', 'style', 'iframe', 'noscript', 'nav', 'footer', 'aside', 'form',
      '.sidebar', '.comments', '.advertisement', '.navigation', '.menu'
    ];

    for (const selector of elementsToRemove) {
      doc.querySelectorAll(selector).forEach(node => {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });
    }

    // Get text from the document body
    const body = doc.body;
    if (!body) return '';
    
    // Get text from paragraphs and headings
    const contentElements = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    
    // If we have content elements, extract text from them
    if (contentElements.length > 0) {
      let content = '';
      contentElements.forEach(element => {
        content += element.textContent + ' ';
      });
      return content.replace(/\s+/g, ' ').trim();
    }
    
    // Fallback to body text
    const text = body.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('Error extracting text:', error);
    return '';
  }
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
    // Parse request body
    const { website_id, url } = await req.json();

    // Validate input
    if (!website_id && !url) {
      throw new Error('Either website_id or url is required');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize variables
    let websiteUrl = url;
    let websiteHomepage = '';
    let title = '';
    
    // If website_id is provided, get the website URL from the database
    if (website_id && !url) {
      const { data: websiteData, error: websiteError } = await supabaseClient
        .from('websites')
        .select('url, name')
        .eq('id', website_id)
        .single();

      if (websiteError) {
        throw new Error(`Failed to get website data: ${websiteError.message}`);
      }

      websiteUrl = websiteData.url;
      title = websiteData.name || '';
      console.log(`Retrieved website URL from database: ${websiteUrl}`);
    }

    // Ensure URL has protocol
    if (websiteUrl && !websiteUrl.startsWith('http')) {
      websiteUrl = 'https://' + websiteUrl;
    }
    
    console.log(`Detecting language for website: ${websiteUrl}`);
    
    // Get homepage URL (remove any paths)
    try {
      const urlObj = new URL(websiteUrl);
      websiteHomepage = `${urlObj.protocol}//${urlObj.hostname}`;
      console.log(`Using homepage URL: ${websiteHomepage}`);
    } catch (error) {
      console.error(`Error parsing URL: ${error}`);
      websiteHomepage = websiteUrl;
    }
    
    // Fetch the homepage content
    console.log(`Fetching content from ${websiteHomepage}`);
    const response = await fetch(websiteHomepage, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentGardener/1.0; +https://contentgardener.ai)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website content: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`Received ${html.length} characters of HTML`);
    
    // Extract text content for language detection
    const textContent = extractTextFromHtml(html);
    console.log(`Extracted ${textContent.length} characters of text content`);
    
    // Detect the language
    const detectedLanguage = await detectLanguage(html, title, textContent);
    
    // Return the result
    return new Response(
      JSON.stringify({
        success: true,
        language: detectedLanguage,
        website_id: website_id || null,
        url: websiteUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 