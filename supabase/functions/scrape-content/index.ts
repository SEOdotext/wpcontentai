import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser, Element, Node } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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
  url: string;
  title: string;
  content: string;
  digest?: string;
  last_fetched: string;
  website_id: string;
}

interface UpdateData {
  content: string;
  last_fetched: string;
  updated_at: string;
  digest?: string;
}

// New function to generate content digest using OpenAI
async function generateContentDigest(title: string, content: string): Promise<string> {
  try {
    console.log(`Generating digest for: ${title}`);
    
    // If content is empty or too short, return empty digest
    if (!content || content.length < 100) {
      console.log('Content too short for digest generation');
      return '';
    }
    
    // Strip HTML tags to get clean text
    const cleanText = content.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, " ").trim();
    
    // Truncate content if it's too long (OpenAI has token limits)
    const maxLength = 8000;
    const truncatedText = cleanText.length > maxLength 
      ? cleanText.substring(0, maxLength) + "..." 
      : cleanText;
    
    console.log(`Content length for digest: ${truncatedText.length} characters`);
    
    // Create prompt for OpenAI - specifying approximately 300 letters
    const prompt = `
Create a concise and informative digest of the following webpage content.
The digest must be around 300 letters (not words) in length.
Focus on the key points, main topics covered, and core information.
The digest should be useful for content planning and understanding the page's relevance.

TITLE: ${title}

CONTENT:
${truncatedText}
    `.trim();
    
    // Log the call to OpenAI
    console.log('Calling OpenAI API for digest generation');
    
    // Call OpenAI API
    const openaiRequestBody = {
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful assistant that creates concise content digests of 300 letters in length.'
        },
        { 
          role: 'user', 
          content: prompt 
        }
      ],
      temperature: 0.5,
      max_tokens: 300
    };
    
    // Log request summary (avoiding logging the full content for brevity)
    console.log('OpenAI request body:', {
      ...openaiRequestBody,
      messages: openaiRequestBody.messages.map(msg => ({
        role: msg.role,
        content_length: msg.content.length
      }))
    });
    
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
      console.error(`OpenAI API error: ${response.status} ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the digest
    let digest = data.choices[0].message.content.trim();
    
    // Ensure the digest is close to 300 letters and ends at a sentence
    if (digest.length > 320) {
      // Find the last sentence boundary before 300 characters
      const match = digest.slice(0, 300).match(/^.*?[.!?](?:\s|$)/g);
      if (match) {
        // Join all complete sentences that fit within ~300 characters
        digest = match.join('').trim();
      } else {
        // If no sentence boundary found, cut at 300 and add ellipsis
        digest = digest.substring(0, 300) + '...';
      }
    } else if (digest.length < 280) {
      console.log(`Digest shorter than expected: ${digest.length} letters`);
    }
    
    console.log('Digest generated successfully:', {
      length: digest.length,
      preview: digest
    });
    
    return digest;
  } catch (error) {
    console.error('Error generating digest:', error);
    return ''; // Return empty string if digest generation fails
  }
}

// Simple fetch scraping
async function simpleFetch(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return await response.text();
  } catch (error) {
    console.error(`Simple fetch failed for ${url}:`, error);
    throw error;
  }
}

// Add delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Modify scrapeWithBrowserless to work within free tier limits
async function scrapeWithBrowserless(url: string, retryCount = 0): Promise<string> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000; // 3 seconds between retries
  const SESSION_TIMEOUT = 45000; // 45 seconds (safe margin below 1 min limit)
  
  const BROWSERLESS_API_KEY = Deno.env.get('BROWSERLESS_API_KEY');
  if (!BROWSERLESS_API_KEY) {
    throw new Error('BROWSERLESS_API_KEY environment variable is not set');
  }
  
  const BROWSERLESS_URL = `https://chrome.browserless.io/content?token=${BROWSERLESS_API_KEY}`;
  
  try {
    console.log('Using Browserless for:', url);
    
    // Add longer delay between requests due to single concurrent browser limit
    if (retryCount > 0) {
      const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount - 1); // Exponential backoff
      console.log(`Waiting ${backoffDelay}ms before retry ${retryCount}`);
      await delay(backoffDelay);
    }
    
    const response = await fetch(BROWSERLESS_URL, {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        waitFor: 1500, // Reduced wait time to 1.5s
        gotoOptions: {
          waitUntil: 'networkidle0',
          timeout: SESSION_TIMEOUT
        },
        // Additional options to optimize for free tier
        rejectResourceTypes: ['image', 'media', 'font', 'stylesheet'],
        setExtraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate'
        }
      })
    });

    if (!response.ok) {
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        console.log(`Rate limited, attempt ${retryCount + 1} of ${MAX_RETRIES}`);
        return scrapeWithBrowserless(url, retryCount + 1);
      }
      throw new Error(`Browserless request failed: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Browserless scraping failed for ${url}:`, error);
    if (retryCount < MAX_RETRIES && (error.message?.includes('429') || error.message?.includes('timeout'))) {
      console.log(`Retrying after error, attempt ${retryCount + 1} of ${MAX_RETRIES}`);
      return scrapeWithBrowserless(url, retryCount + 1);
    }
    throw error;
  }
}

// Combined scraping function
async function scrapeContent(url: string): Promise<string> {
  try {
    // Try simple fetch first
    console.log(`Attempting simple fetch for ${url}`);
    const html = await simpleFetch(url);
    
    // Check if we got meaningful content
    if (html.length > 500) { // Basic check for meaningful content
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (doc) {
        const mainContent = doc.querySelector('article, main, .content, .post-content, #content');
        if (mainContent) {
          console.log('Successfully scraped with simple fetch');
          return html;
        }
      }
    }
    
    console.log('Simple fetch did not get meaningful content, trying Browserless');
    return await scrapeWithBrowserless(url);
    
  } catch (error) {
    console.log('Simple fetch failed, falling back to Browserless');
    return await scrapeWithBrowserless(url);
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
    const { website_id, website_url } = await req.json();

    // Check if we have required parameters
    if (!website_id && !website_url) {
      throw new Error('Either website_id or website_url is required');
    }
    
    // Log the request params
    console.log(`Scrape content request - website_id: ${website_id}, website_url: ${website_url}`);
    
    // Flag to indicate if we're in onboarding mode (direct URL provided)
    const isOnboarding = !!website_url;
    console.log(`Operating in onboarding mode: ${isOnboarding}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let pagesToProcess: WebsiteContent[] = [];
    
    // If in onboarding mode with direct URL, use that URL
    if (isOnboarding) {
      console.log(`Using direct URL in onboarding mode: ${website_url}`);
      pagesToProcess = [{
        id: `temp-${Date.now()}`,
        url: website_url,
        title: 'Onboarding Page',
        website_id: website_id || `temp-${Date.now()}`,
        content: '',
        last_fetched: new Date().toISOString()
      }];
    } else {
      // Otherwise, get key content pages from the database
      console.log(`Looking up cornerstone pages for website ID: ${website_id}`);
      const { data: pages, error: fetchError } = await supabaseClient
        .from('website_content')
        .select('*')
        .eq('website_id', website_id)
        .eq('is_cornerstone', true);

      if (fetchError) {
        throw fetchError;
      }

      if (!pages?.length) {
        return new Response(
          JSON.stringify({ 
            message: 'No key content pages found to analyze',
            pages: [] 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      pagesToProcess = pages as WebsiteContent[];
    }
    
    console.log(`Found ${pagesToProcess.length} pages to process`);

    // Process pages in batches to avoid overwhelming the server
    const batchSize = 5;
    const results: WebsiteContent[] = [];
    let processedCount = 0;

    for (let i = 0; i < pagesToProcess.length; i += batchSize) {
      const batch = pagesToProcess.slice(i, i + batchSize);
      
      // Process each page in sequence with longer delays
      const batchResults = [];
      for (const page of batch) {
        try {
          // Use the combined scraping function
          console.log(`Starting content scraping for ${page.url}`);
          const html = await scrapeContent(page.url);
          console.log(`Received ${html.length} characters of HTML from ${page.url}`);
          
          // Extract main content - this is synchronous
          const cleanContent = extractMainContent(html);
          console.log(`Extracted content for ${page.url}: ${cleanContent.length} characters`);
          
          if (cleanContent.length > 0) {
            console.log(`Starting digest generation for ${page.url} with available content`);
            let digest = '';
            try {
              digest = await generateContentDigest(page.title, cleanContent);
              if (digest) {
                console.log(`Digest generated for ${page.url} (${digest.length} chars)`);
              } else {
                console.log(`No digest could be generated for ${page.url}`);
              }
            } catch (digestError) {
              console.error(`Error generating digest for ${page.url}:`, digestError);
            }
            
            if (!isOnboarding) {
              const updateData: UpdateData = {
                content: cleanContent,
                last_fetched: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              if (digest) {
                updateData.digest = digest;
              }
              
              const { error: updateError } = await supabaseClient
                .from('website_content')
                .update(updateData)
                .eq('id', page.id);

              if (updateError) {
                console.error(`Error updating page ${page.url}:`, updateError);
              }
            }

            processedCount++;
            batchResults.push({
              ...page,
              content: cleanContent,
              digest: digest,
              last_fetched: new Date().toISOString()
            });
          } else {
            console.error(`No content extracted for ${page.url}, skipping digest generation`);
            batchResults.push(null);
          }
          
          // Increased delay between pages due to single concurrent browser limit
          if (batch.length > 1) {
            await delay(3000); // 3 second delay between pages
          }
          
        } catch (error) {
          console.error(`Error processing page ${page.url}:`, error);
          batchResults.push(null);
          // Still add delay even after error
          if (batch.length > 1) {
            await delay(3000);
          }
        }
      }
      
      results.push(...(batchResults.filter(r => r !== null) as WebsiteContent[]));
      
      // Increased delay between batches
      if (i + batchSize < pagesToProcess.length) {
        await delay(5000); // 5 second delay between batches
      }
    }

    return new Response(
      JSON.stringify({
        message: `Successfully analyzed ${processedCount} of ${pagesToProcess.length} pages`,
        pages: results,
        total: pagesToProcess.length,
        processed: processedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Formats plain text content by adding paragraph tags and preserving line breaks
 */
function formatPlainText(text: string): string {
  return text
    .split(/\n\s*\n/)
    .filter(p => p.trim().length > 0)
    .map(p => `<p>${p.trim().replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

function extractMainContent(html: string): string {
  try {
    // Create a DOM parser
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc) return '';

    // Remove unwanted elements
    const elementsToRemove = [
      'script',
      'style',
      'iframe',
      'noscript',
      'nav',
      'header',
      'footer',
      'aside',
      'form',
      '.sidebar',
      '.comments',
      '.advertisement',
      '#sidebar',
      '#comments',
      '#footer',
      '#header',
      '.header',
      '.footer',
      '.navigation',
      '.menu',
      '.cart',
      '.shopping-cart',
      '.search',
      '.social',
      '.cookie',
      '.popup',
      '.modal',
      '.banner',
      '.ad',
      '.widget'
    ];

    elementsToRemove.forEach(selector => {
      doc.querySelectorAll(selector).forEach((node) => {
        if (node instanceof Element) {
          node.remove();
        }
      });
    });

    // Try to find the main content container
    const mainContent = 
      doc.querySelector('article') || 
      doc.querySelector('main') || 
      doc.querySelector('.content') || 
      doc.querySelector('.post-content') ||
      doc.querySelector('.entry-content') ||
      doc.querySelector('.page-content') ||
      doc.querySelector('#content') ||
      doc.querySelector('[role="main"]');

    // If we found a main content container, use it
    if (mainContent instanceof Element) {
      // Clean up the content before returning
      return cleanAndStructureContent(mainContent);
    }

    // If no main content container is found, try to extract content from the body
    // but first remove common non-content sections
    const body = doc.body;
    if (!body) return '';
    
    // Extract text content from paragraphs and headings
    const contentElements = Array.from(body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote'));
    
    if (contentElements.length > 0) {
      // Create a new div to hold our extracted content
      const extractedContent = doc.createElement('div');
      
      // Add each content element to our container
      contentElements.forEach(el => {
        if (el instanceof Element) {
          extractedContent.appendChild(el.cloneNode(true));
        }
      });
      
      return cleanAndStructureContent(extractedContent);
    }
    
    // Last resort: just clean up the body content
    return cleanAndStructureContent(body);
  } catch (error) {
    console.error('Error extracting content:', error);
    return '';
  }
}

/**
 * Cleans and structures HTML content to ensure proper formatting
 */
function cleanAndStructureContent(element: Element): string {
  // Get the HTML content
  let html = element.innerHTML || '';
  
  // Remove excessive whitespace
  html = html.replace(/\s+/g, ' ');
  
  // Replace consecutive <br> tags with paragraph breaks
  html = html.replace(/(<br\s*\/?>\s*){2,}/gi, '</p><p>');
  
  // Wrap plain text nodes in paragraphs
  const tempDoc = new DOMParser().parseFromString(html, 'text/html');
  if (!tempDoc) return html;
  
  // Process text nodes
  const processNode = (node: Node) => {
    if (node.nodeType === 3 && node.textContent?.trim()) { // Text node
      const parent = node.parentElement;
      if (parent && parent.tagName !== 'P' && parent.tagName !== 'DIV' && 
          parent.tagName !== 'H1' && parent.tagName !== 'H2' && 
          parent.tagName !== 'H3' && parent.tagName !== 'H4' && 
          parent.tagName !== 'H5' && parent.tagName !== 'H6' && 
          parent.tagName !== 'LI' && parent.tagName !== 'TD' &&
          parent.tagName !== 'SPAN' && parent.tagName !== 'A' &&
          parent.tagName !== 'STRONG' && parent.tagName !== 'EM' &&
          parent.tagName !== 'B' && parent.tagName !== 'I') {
        
        // Create a paragraph element
        const p = tempDoc.createElement('p');
        // Replace the text node with the paragraph
        parent.replaceChild(p, node);
        // Add the text to the paragraph
        p.appendChild(node);
      }
    }
    
    // Process child nodes
    const childNodes = Array.from(node.childNodes);
    childNodes.forEach(child => {
      if (child instanceof Node && (child.nodeType === 1 || child.nodeType === 3)) { // Element or text node
        processNode(child);
      }
    });
  };
  
  if (tempDoc.body) {
    processNode(tempDoc.body);
    
    // Get the processed HTML
    html = tempDoc.body.innerHTML;
  }
  
  // Ensure paragraphs have proper spacing
  html = html.replace(/<\/p>\s*<p>/g, '</p>\n<p>');
  
  // Ensure headings have proper spacing
  html = html.replace(/<\/h([1-6])>\s*<([^>]+)>/g, '</h$1>\n<$2>');
  
  // Ensure lists have proper spacing
  html = html.replace(/<\/(ul|ol)>\s*<([^>]+)>/g, '</$1>\n<$2>');
  
  // If the content still doesn't have proper HTML formatting, add it
  if (!html.includes('<p>') && !html.includes('<div>')) {
    html = formatPlainText(html);
  }
  
  return html;
} 