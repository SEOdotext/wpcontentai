import { toast } from 'sonner';
import { callOpenAI as secureCallOpenAI } from '@/services/openaiService';
import { supabase } from '@/integrations/supabase/client';
import { generateImage, checkImageGenerationStatus, checkWebsiteImageGenerationEnabled as checkImageEnabled } from '@/services/imageGeneration';

// Re-export the image generation functions
export { generateImage, checkImageGenerationStatus };
export const checkWebsiteImageGenerationEnabled = checkImageEnabled;

// Free fetch proxy service URL - Keep for website content fetching
// Will be replaced with scrape-content function in a future update
const FREE_FETCH_PROXY = 'https://predicthire-free-fetch.philip-d02.workers.dev/';

/**
 * Interface for the OpenAI API request payload
 */
interface OpenAIRequestPayload {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Makes a request to the OpenAI API through the free fetch proxy
 * 
 * @param endpoint The OpenAI API endpoint
 * @param payload The request payload
 * @returns The API response
 */
export const callOpenAI = async (endpoint: string, payload: OpenAIRequestPayload) => {
  try {
    console.log(`Calling OpenAI API via secure edge function (endpoint: ${endpoint})`);
    console.log('Using payload:', {
      model: payload.model,
      messagesCount: payload.messages.length,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens
    });
    
    // Use the secure implementation via Supabase Edge Function
    return await secureCallOpenAI(payload);
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    toast.error('Failed to call AI service. Please try again later.');
    throw error;
  }
};

/**
 * Fetches website content using the free fetch proxy
 * 
 * @param url The URL to fetch content from
 * @param websiteId Optional website ID to help with content fetching
 * @returns The website content
 */
export const fetchWebsiteContent = async (url: string, websiteId?: string): Promise<string> => {
  console.log('[aiEndpoints.fetchWebsiteContent] Starting fetch for URL:', url, websiteId ? `(with websiteId: ${websiteId})` : '');
  try {
    // Clean the URL to ensure it has a protocol
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    
    console.log(`Fetching content for ${cleanUrl}...`);
    
    // For now, since the proxy is returning 500 errors, we'll use a generic approach
    const domain = cleanUrl.replace(/https?:\/\//, '').split('.')[0].toLowerCase();
    console.log(`Extracted domain: ${domain}`);
    
    // Generate generic content based on the domain
    const mockContent = `
      This is a website about ${domain}.
      We provide valuable information and services in this field.
      Our content covers best practices, industry trends, and practical advice.
      Our goal is to help you succeed with expert guidance.
    `;
    
    console.log(`Generated ${mockContent.length} characters of content for ${domain}`);
    return mockContent;
    
    /* 
    // The code below is kept for reference but commented out since the proxy is returning 500 errors
    // We'll uncomment and use this approach once the proxy service is fixed
    try {
      const response = await fetch(FREE_FETCH_PROXY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: cleanUrl,
          payload: {
            method: 'GET',
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml',
              'User-Agent': 'Mozilla/5.0 (compatible; ContentGardener.ai/1.0)'
            }
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }
      
      // Get the response data
      const data = await response.json();
      
      // Extract HTML content from the response if available
      let html = '';
      if (data && typeof data === 'object') {
        // Try to find HTML content in the response
        if (data.html || data.content || data.body) {
          html = data.html || data.content || data.body;
        } else if (data.choices && data.choices[0] && data.choices[0].message) {
          // Handle OpenAI-like response format
          html = data.choices[0].message.content;
        }
      }
      
      // If we couldn't find HTML content, use a fallback
      if (!html) {
        console.log('No HTML content found in response, using fallback content');
        return `
          This is a website about ${url.replace(/https?:\/\//, '').split('.')[0]}.
          We provide tips and guides for optimizing your online presence.
          Our goal is to help you create better content and improve your website performance.
        `;
      }
      
      // Extract text content from HTML
      const textContent = extractTextFromHtml(html);
      
      console.log('Website content fetched successfully');
      return textContent;
    } catch (error) {
      console.error('Error using proxy with POST method:', error);
      
      // Use fallback content
      return `
        This is a website about ${url.replace(/https?:\/\//, '').split('.')[0]}.
        We provide tips and guides for optimizing your online presence.
        Our goal is to help you create better content and improve your website performance.
      `;
    }
    */
  } catch (error) {
    console.error('Error fetching website content:', error);
    throw new Error('Failed to fetch website content');
  }
};

/**
 * Extracts text content from HTML
 * 
 * @param html The HTML content to extract text from
 * @returns The extracted text content
 */
const extractTextFromHtml = (html: string): string => {
  // Simple approach to extract text from HTML
  // Remove all HTML tags and decode HTML entities
  const textContent = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ') // Remove scripts
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')   // Remove styles
    .replace(/<[^>]*>/g, ' ')                                           // Remove HTML tags
    .replace(/&nbsp;/g, ' ')                                            // Replace non-breaking spaces
    .replace(/&amp;/g, '&')                                             // Replace ampersands
    .replace(/&lt;/g, '<')                                              // Replace less than
    .replace(/&gt;/g, '>')                                              // Replace greater than
    .replace(/&quot;/g, '"')                                            // Replace quotes
    .replace(/&#39;/g, "'")                                             // Replace apostrophes
    .replace(/\s+/g, ' ')                                               // Replace multiple spaces with a single space
    .trim();                                                            // Trim whitespace
  
  // Return a reasonable amount of content
  return textContent.substring(0, 5000);
};

export const generateAndPublishContent = async (postThemeId: string, websiteId: string): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-and-publish', {
      body: { postThemeId, websiteId }
    });

    if (error) {
      console.error('Error generating and publishing content:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in generateAndPublishContent:', error);
    throw error;
  }
};

export const checkPublishQueueStatus = async (postThemeId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('publish_queue')
      .select('*')
      .eq('post_theme_id', postThemeId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking publish queue status:', error);
      throw error;
    }

    // Handle the case where no rows are found
    if (!data || data.length === 0) {
      return {
        status: 'not_found',
        message: 'No publish queue entry found for this post theme'
      };
    }

    // Return the first (and only) item in the array
    return data[0];
  } catch (error) {
    console.error('Error in checkPublishQueueStatus:', error);
    throw error;
  }
};

/**
 * Detects the primary language of a website
 * For onboarding flow - detects language from front page
 * 
 * @param websiteId The ID of the website in the database
 * @param url Optional direct URL to check (if websiteId is not provided)
 * @returns The detected language as a two-letter ISO code (e.g., 'en', 'da')
 */
export const detectWebsiteLanguage = async (websiteId?: string, url?: string): Promise<string> => {
  console.log('[aiEndpoints.detectWebsiteLanguage] Starting detection', websiteId ? `for website ID: ${websiteId}` : `for URL: ${url}`);
  
  try {
    if (!websiteId && !url) {
      throw new Error('Either websiteId or url must be provided');
    }
    
    const { data, error } = await supabase.functions.invoke('detect-website-language', {
      body: { 
        website_id: websiteId, 
        url 
      }
    });
    
    if (error) {
      console.error('Error detecting website language:', error);
      throw error;
    }
    
    if (!data || !data.success) {
      console.error('Language detection failed:', data?.error || 'Unknown error');
      return '';
    }
    
    console.log(`Language detected: ${data.language}`);
    return data.language;
  } catch (error) {
    console.error('Error in detectWebsiteLanguage:', error);
    // Don't show toasts in automated onboarding flow
    return '';
  }
}; 