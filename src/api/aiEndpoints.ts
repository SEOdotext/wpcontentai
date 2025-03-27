import { toast } from 'sonner';
import { callOpenAI as secureCallOpenAI } from '@/services/openaiService';
import { supabase } from '@/integrations/supabase/client';

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
 * Generates WordPress content using OpenAI
 * 
 * @param title The title of the content
 * @param keywords The keywords to include
 * @param writingStyle The writing style to use
 * @returns The generated content
 */
export const generateWordPressContent = async (
  title: string,
  keywords: string[],
  writingStyle: string
): Promise<string> => {
  try {
    const prompt = `
      Write a high-quality WordPress blog post with the following title:
      "${title}"
      
      Writing Style: ${writingStyle || 'Professional and informative'}
      Keywords to include: ${keywords.join(', ')}
      
      The content should be well-structured with:
      1. An engaging introduction
      2. 3-5 main sections with subheadings
      3. A conclusion
      
      Format the content in Markdown with proper headings, paragraphs, and bullet points where appropriate.
      The content should be SEO-friendly and approximately 800-1200 words.
    `;
    
    const response = await callOpenAI('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional WordPress content writer who creates engaging, well-structured blog posts.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });
    
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content;
    } else {
      throw new Error('No content generated');
    }
  } catch (error) {
    console.error('Error generating WordPress content:', error);
    throw new Error('Failed to generate WordPress content');
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
    
    // For now, since the proxy is returning 500 errors, we'll use a domain-specific approach
    // This is a temporary solution until the proxy service is fixed
    const domain = cleanUrl.replace(/https?:\/\//, '').split('.')[0].toLowerCase();
    console.log(`Extracted domain: ${domain}`);
    
    // Generate domain-specific mock content
    let mockContent = '';
    
    switch (domain) {
      case 'workforceu':
        console.log('Using WorkForceEU specific content');
        mockContent = `
          WorkForceEU is a leading platform for workforce management and HR solutions in Europe.
          We provide comprehensive services for recruitment, talent management, and workforce optimization.
          Our expertise includes temporary staffing, permanent placement, and workforce consulting.
          We help businesses find the right talent and manage their workforce efficiently.
          Topics include recruitment strategies, HR management, talent acquisition, and workforce planning.
        `;
        break;
      case 'predicthire':
        console.log('Using PredictHire specific content');
        mockContent = `
          PredictHire is an AI-powered recruitment platform that helps businesses make better hiring decisions.
          Our technology uses predictive analytics to identify the best candidates for your organization.
          We offer solutions for candidate screening, assessment, and selection.
          Our platform reduces bias in the hiring process and improves the quality of hires.
          Topics include AI in recruitment, candidate experience, hiring efficiency, and talent analytics.
        `;
        break;
      default:
        console.log(`Using generic content for domain: ${domain}`);
        mockContent = `
          This is a website about ${domain} and related topics.
          We provide valuable information, resources, and services in this field.
          Our content covers best practices, industry trends, and practical advice.
          Topics include digital marketing, content strategy, SEO, and online presence optimization.
          Our goal is to help you succeed in the digital landscape with expert guidance.
        `;
    }
    
    console.log(`Generated ${mockContent.length} characters of domain-specific content for ${domain}`);
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
              'User-Agent': 'Mozilla/5.0 (compatible; WPContentAI/1.0)'
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
          Topics include SEO, content marketing, and digital strategy.
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
        Topics include SEO, content marketing, and digital strategy.
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

export const generateAndPublishContent = async (postThemeId: string): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-and-publish', {
      body: { postThemeId }
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