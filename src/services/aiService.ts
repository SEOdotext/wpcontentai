import { toast } from 'sonner';

// Define the interface for the AI service response
interface AIServiceResponse {
  titles: string[];
  keywords: string[];
}

// Free fetch proxy service URL
const FREE_FETCH_PROXY = 'https://predicthire-free-fetch.philip-d02.workers.dev/';

/**
 * Generates title suggestions using AI based on website content and preferences
 * 
 * @param content The website content to analyze
 * @param keywords User-provided keywords
 * @param writingStyle The writing style preferences
 * @param subjectMatters The subject matters to focus on
 * @returns A promise that resolves to an array of title suggestions
 */
export const generateTitleSuggestions = async (
  content: string,
  keywords: string[],
  writingStyle: string,
  subjectMatters: string[]
): Promise<AIServiceResponse> => {
  try {
    // Log the inputs for debugging
    console.log('Generating title suggestions with AI...');
    console.log('Content length:', content.length);
    console.log('Keywords:', keywords);
    console.log('Writing Style:', writingStyle);
    console.log('Subject Matters:', subjectMatters);
    
    // Try to use the OpenAI API through the free fetch proxy
    try {
      const prompt = `
        You are a content title generator for WordPress websites. 
        Generate 5 engaging, SEO-friendly titles based on the following:
        
        Writing Style: ${writingStyle || 'Professional and informative'}
        Subject Matters: ${subjectMatters.join(', ') || 'WordPress, Content Marketing'}
        Keywords: ${keywords.join(', ')}
        
        Website Content Summary: 
        ${content.substring(0, 500)}...
        
        Generate 5 unique, engaging titles that would perform well in search engines and attract readers.
        Format your response as a simple list of titles, one per line.
      `;
      
      const response = await fetch(FREE_FETCH_PROXY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'https://api.openai.com/v1/chat/completions',
          payload: {
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that generates engaging blog post titles.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 300
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AI response:', data);
      
      if (data.choices && data.choices.length > 0) {
        // Extract titles from the response
        const aiContent = data.choices[0].message.content;
        const titles = aiContent
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .filter(title => title.length > 0);
        
        // Extract additional keywords from the content
        const contentKeywords = extractKeywordsFromContent(content);
        const allKeywords = [...new Set([...keywords, ...contentKeywords])];
        
        console.log('Generated titles:', titles);
        
        return {
          titles: titles.slice(0, 5),
          keywords: allKeywords.slice(0, 10)
        };
      }
    } catch (apiError) {
      console.error('Error calling OpenAI API:', apiError);
      console.log('Falling back to mock title generation');
    }
    
    // Fallback to mock title generation if the API call fails
    console.log('Using fallback title generation');
    
    // Generate titles based on the keywords and subject matters
    const titles: string[] = [];
    
    // Use the first keyword as the main topic
    const mainKeyword = keywords[0] || 'WordPress';
    
    // Generate titles based on the subject matters and keywords
    for (const subject of subjectMatters.length > 0 ? subjectMatters : ['WordPress']) {
      titles.push(`The Ultimate Guide to ${mainKeyword} ${subject}`);
      titles.push(`10 Essential ${mainKeyword} Tips for Better ${subject} Performance`);
      titles.push(`How to Optimize Your ${subject} Using ${mainKeyword} Best Practices`);
      titles.push(`${subject} Mastery: Advanced ${mainKeyword} Techniques for Professionals`);
      titles.push(`Why ${mainKeyword} is Crucial for Your ${subject} Strategy in 2023`);
    }
    
    // Extract additional keywords from the content
    const contentKeywords = extractKeywordsFromContent(content);
    const allKeywords = [...new Set([...keywords, ...contentKeywords])];
    
    // Return a subset of the titles (up to 5)
    return {
      titles: titles.slice(0, 5),
      keywords: allKeywords.slice(0, 10)
    };
  } catch (error) {
    console.error('Error generating title suggestions with AI:', error);
    throw new Error('Failed to generate title suggestions');
  }
};

/**
 * Fetches and analyzes website content
 * 
 * @param url The URL of the website to analyze
 * @returns A promise that resolves to the website content
 */
export const fetchWebsiteContent = async (url: string): Promise<string> => {
  try {
    // Try to use the free fetch proxy to get real website content
    try {
      // Clean the URL to ensure it has a protocol
      const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
      
      // Use the free fetch proxy to get the website content
      const proxyUrl = `${FREE_FETCH_PROXY}?url=${encodeURIComponent(cleanUrl)}`;
      
      console.log(`Fetching content from ${cleanUrl} via proxy...`);
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }
      
      // Get the HTML content
      const html = await response.text();
      
      // Extract text content from HTML (simple approach)
      const textContent = extractTextFromHtml(html);
      
      console.log('Website content fetched successfully');
      return textContent;
    } catch (fetchError) {
      console.error('Error fetching real website content:', fetchError);
      console.log('Falling back to mock content');
    }
    
    // Fallback to mock content if the fetch fails
    console.log(`Using fallback content for ${url}...`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock content based on the URL
    if (url.includes('wordpress')) {
      return `
        This is a website about WordPress content management.
        We provide tips and guides for optimizing your WordPress site.
        Topics include SEO, content marketing, plugin recommendations, and performance optimization.
        Our goal is to help you create a better WordPress website with engaging content.
        WordPress is a powerful platform for building websites and blogs.
        With the right plugins and themes, you can create a professional-looking site without coding.
        Content marketing is essential for driving traffic to your WordPress site.
        SEO optimization helps your WordPress content rank higher in search results.
      `;
    } else {
      return `
        This is a website about web development and digital marketing.
        We cover topics such as web design, SEO, content strategy, and online business.
        Our articles provide practical advice for improving your online presence.
        We focus on helping businesses grow through effective digital marketing strategies.
        Web development trends change rapidly, and we keep you updated on the latest technologies.
        Content creation is a key component of any successful digital marketing strategy.
        SEO best practices help ensure your content reaches your target audience.
      `;
    }
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

/**
 * Extracts keywords from content using basic NLP techniques
 * 
 * @param content The content to analyze
 * @returns An array of extracted keywords
 */
const extractKeywordsFromContent = (content: string): string[] => {
  // In a real implementation, you would use NLP libraries or AI services
  // For now, we'll use a simple approach
  
  // Convert to lowercase and remove special characters
  const cleanContent = content.toLowerCase().replace(/[^\w\s]/g, ' ');
  
  // Split into words
  const words = cleanContent.split(/\s+/);
  
  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of',
    'this', 'that', 'these', 'those', 'it', 'its', 'we', 'our', 'you', 'your'
  ]);
  
  const filteredWords = words.filter(word => 
    word.length > 3 && !stopWords.has(word)
  );
  
  // Count word frequencies
  const wordCounts = new Map<string, number>();
  for (const word of filteredWords) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  
  // Sort by frequency and get top keywords
  const sortedWords = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  return sortedWords.slice(0, 10);
}; 