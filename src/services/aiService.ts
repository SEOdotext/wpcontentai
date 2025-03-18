import { toast } from 'sonner';

// Define the interface for the AI service response
interface AIServiceResponse {
  titles: string[];
  keywords: string[];
  keywordsByTitle?: { [title: string]: string[] };
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
      // First prompt to generate titles
      const titlesPrompt = `
        You are a content title generator for WordPress websites. 
        Generate 5 engaging, SEO-friendly titles based on the following:
        
        Writing Style: ${writingStyle || 'Professional and informative'}
        Subject Matters: ${subjectMatters.join(', ') || 'WordPress, Content Marketing'}
        Keywords: ${keywords.join(', ')}
        
        Website Content Summary: 
        ${content.substring(0, 500)}...
        
        Important capitalization rules:
        1. For Danish titles: Only capitalize the first word and proper nouns, NOT every word in the title.
        2. For English titles: Capitalize main words following standard English title case.
        
        Generate 5 unique, engaging titles that would perform well in search engines and attract readers.
        Use proper Danish capitalization if the content appears to be in Danish (only capitalize first word and proper nouns).
        
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
                content: titlesPrompt
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
      console.log('AI response for titles:', data);
      
      if (data.choices && data.choices.length > 0) {
        // Extract titles from the response
        const aiContent = data.choices[0].message.content;
        const titles = aiContent
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .filter(title => title.length > 0)
          .slice(0, 5); // Limit to 5 titles
        
        // Now generate specific keywords for each title
        const keywordsByTitle: { [title: string]: string[] } = {};
        
        // Create a second prompt to generate keywords for each title
        const keywordsPrompt = `
          Generate 3-5 focused, relevant keywords or short phrases for each of these blog post titles.
          
          The keywords should be:
          1. Category-oriented (good for WordPress categories/tags)
          2. Directly related to the specific post topic
          3. Include relevant domain-specific terms like: personale udlejning, arbejdskraft, rekruttering, medarbejdere, udenlandsk arbejdskraft
          4. Can include short phrases (2-3 words) that capture key concepts
          5. Focus heavily on these subject matters: ${subjectMatters.join(', ')}
          
          AVOID generic single words like: virksomhed, løsning, sammenligning, bedste, tips, pålidelig
          
          Titles:
          ${titles.map((title, i) => `${i+1}. ${title}`).join('\n')}
          
          Format your response like this:
          Title 1 Keywords: keyword1, keyword phrase, specific term
          Title 2 Keywords: keyword1, keyword phrase, specific term
          etc.
        `;
        
        // Make a second API call to get keywords for each title
        const keywordsResponse = await fetch(FREE_FETCH_PROXY, {
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
                  content: 'You are a helpful assistant that generates relevant keywords for blog posts.'
                },
                {
                  role: 'user',
                  content: keywordsPrompt
                }
              ],
              temperature: 0.3,
              max_tokens: 500
            }
          })
        });
        
        if (keywordsResponse.ok) {
          const keywordsData = await keywordsResponse.json();
          console.log('AI response for keywords:', keywordsData);
          
          if (keywordsData.choices && keywordsData.choices.length > 0) {
            const keywordsContent = keywordsData.choices[0].message.content;
            const keywordsLines = keywordsContent.split('\n').filter(line => line.trim());
            
            // Parse the keywords for each title
            keywordsLines.forEach(line => {
              const match = line.match(/Title (\d+) Keywords: (.*)/i) || line.match(/(\d+)\.\s*Keywords: (.*)/i);
              if (match) {
                const titleIndex = parseInt(match[1]) - 1;
                const titleKeywords = match[2].split(',').map(k => k.trim()).filter(k => k);
                
                if (titleIndex >= 0 && titleIndex < titles.length) {
                  keywordsByTitle[titles[titleIndex]] = titleKeywords;
                }
              }
            });
          }
        }
        
        // For any titles without keywords, generate them using our fallback method
        titles.forEach(title => {
          if (!keywordsByTitle[title]) {
            keywordsByTitle[title] = generateFocusedKeywords(title, keywords, subjectMatters);
          }
        });
        
        // Use the first title's keywords as the default set
        const defaultKeywords = keywordsByTitle[titles[0]] || 
          generateFocusedKeywords(titles[0], keywords, subjectMatters);
        
        console.log('Generated titles with unique keywords:', keywordsByTitle);
        
        return {
          titles: titles,
          keywords: defaultKeywords,
          keywordsByTitle: keywordsByTitle
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
    
    // Detect if we're likely working with Danish content
    const isDanish = content.toLowerCase().includes('dansk') || 
      subjectMatters.some(subject => 
        subject.toLowerCase().includes('dansk') || 
        subject.toLowerCase().includes('personale udlejning') ||
        subject.toLowerCase().includes('arbejdskraft')
      );
    
    // Helper to format title according to language rules
    const formatTitle = (title: string): string => {
      if (isDanish) {
        // For Danish: only capitalize first letter and proper nouns
        // This is a simple implementation - proper nouns detection would require NLP
        return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
      } else {
        // Keep as is for English (already formatted in title case)
        return title;
      }
    };
    
    // Generate titles based on the subject matters and keywords
    for (const subject of subjectMatters.length > 0 ? subjectMatters : ['WordPress']) {
      titles.push(formatTitle(`The Ultimate Guide to ${mainKeyword} ${subject}`));
      titles.push(formatTitle(`10 Essential ${mainKeyword} Tips for Better ${subject} Performance`));
      titles.push(formatTitle(`How to Optimize Your ${subject} Using ${mainKeyword} Best Practices`));
      titles.push(formatTitle(`${subject} Mastery: Advanced ${mainKeyword} Techniques for Professionals`));
      titles.push(formatTitle(`Why ${mainKeyword} is Crucial for Your ${subject} Strategy in 2023`));
    }
    
    // Limit to 5 titles
    const finalTitles = titles.slice(0, 5);
    
    // Create unique keywords for each title
    const keywordsByTitle: { [title: string]: string[] } = {};
    finalTitles.forEach(title => {
      keywordsByTitle[title] = generateFocusedKeywords(title, keywords, subjectMatters);
    });
    
    // Use the first title's keywords as the default set
    const defaultKeywords = keywordsByTitle[finalTitles[0]] || [];
    
    // Return a subset of the titles (up to 5)
    return {
      titles: finalTitles,
      keywords: defaultKeywords,
      keywordsByTitle: keywordsByTitle
    };
  } catch (error) {
    console.error('Error generating title suggestions with AI:', error);
    throw new Error('Failed to generate title suggestions');
  }
};

/**
 * Generates focused, relevant keywords for a post based on its title and context
 * 
 * @param title The post title
 * @param userKeywords Keywords provided by the user
 * @param subjectMatters Subject matters from settings
 * @returns Array of focused keywords
 */
const generateFocusedKeywords = (title: string, userKeywords: string[], subjectMatters: string[]): string[] => {
  // Convert title to lowercase
  const lowerTitle = title.toLowerCase();
  
  // Create category-oriented keywords
  const result: string[] = [];
  
  // 1. PRIORITY: Include relevant subject matters
  // Find up to 2 subject matters that relate to the title
  const relevantSubjects = subjectMatters
    .filter(subject => lowerTitle.includes(subject.toLowerCase()))
    .slice(0, 2);
  
  if (relevantSubjects.length > 0) {
    result.push(...relevantSubjects);
  } else {
    // If no exact match, look for partial matches in subject matters
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
  
  // 2. Add domain-specific terms if they're relevant to the title
  const domainTerms = [
    "personale udlejning", 
    "udenlandsk arbejdskraft", 
    "rekruttering", 
    "vikarbureau",
    "arbejdsmarked"
  ];
  
  const relevantDomainTerms = domainTerms
    .filter(term => lowerTitle.includes(term.toLowerCase()))
    .slice(0, 2);
  
  if (relevantDomainTerms.length > 0) {
    result.push(...relevantDomainTerms);
  }
  
  // 3. Extract key phrases from the title (2-3 word phrases)
  const titleWords = lowerTitle.split(/\s+/).filter(w => w.length > 3 && !isCommonWord(w));
  
  if (titleWords.length >= 2) {
    // Create phrases from adjacent words in the title
    for (let i = 0; i < titleWords.length - 1; i++) {
      const phrase = `${titleWords[i]} ${titleWords[i+1]}`;
      if (phrase.length >= 5 && !result.includes(phrase)) {
        result.push(phrase);
        break; // Just add one phrase to avoid too many
      }
    }
  }
  
  // 4. Add specific user keywords that aren't just generic terms
  const qualityUserKeywords = userKeywords
    .filter(keyword => 
      keyword.length > 5 || // Longer keywords are more likely to be specific 
      keyword.includes(' ') || // Multi-word keywords are usually more specific
      domainTerms.some(term => term.toLowerCase().includes(keyword.toLowerCase())) // Domain-relevant
    )
    .slice(0, 2);
  
  result.push(...qualityUserKeywords);
  
  // 5. If we still need more keywords, add some topical categories based on the title
  if (result.length < 3) {
    // Check for common content types
    if (lowerTitle.includes('guide') || lowerTitle.includes('sådan')) {
      result.push('guides og vejledninger');
    }
    if (lowerTitle.includes('fordel') || lowerTitle.includes('benefit')) {
      result.push('fordele og muligheder');
    }
    if (lowerTitle.includes('erfaring') || lowerTitle.includes('case')) {
      result.push('erfaringer og cases');
    }
    if (lowerTitle.includes('lovgivning') || lowerTitle.includes('regler')) {
      result.push('lovgivning og regler');
    }
  }
  
  // Deduplicate and limit to 5 keywords
  return [...new Set(result)].slice(0, 5);
};

/**
 * Checks if a word is a common word that shouldn't be used as a keyword
 */
const isCommonWord = (word: string): boolean => {
  const commonWords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'will', 
    'have', 'more', 'what', 'about', 'when', 'been', 'were', 'they', 'but',
    'into', 'just', 'like', 'some', 'than', 'then', 'only', 'very', 'also',
    'much', 'any', 'new', 'best', 'using', 'use', 'used', 'most', 'top', 'our'
  ]);
  
  return commonWords.has(word);
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