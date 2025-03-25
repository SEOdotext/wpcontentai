import { toast } from 'sonner';
import { callOpenAI } from '@/services/openaiService';
import { supabase } from '@/integrations/supabase/client';
import { languages } from '@/data/languages';

// Define the interface for the AI service response
interface AIServiceResponse {
  titles: string[];
  keywords: string[];
  keywordsByTitle?: { [title: string]: string[] };
}

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
        
        Important rules:
        1. Generate ONLY the titles, nothing else
        2. Each title should be on its own line
        3. No numbering, bullet points, or other formatting
        4. No additional text or explanations
        5. For Danish titles: Only capitalize the first word and proper nouns
        6. For English titles: Capitalize main words following standard English title case
        
        Example format:
        Title 1
        Title 2
        Title 3
        Title 4
        Title 5
      `;
      
      // Use the new openaiService instead of direct FREE_FETCH_PROXY
      const data = await callOpenAI({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are a professional WordPress content creator who writes engaging, SEO-friendly blog posts with proper HTML formatting. NEVER include WordPress theme elements like post titles, dates, authors, categories, or tags in your content. Focus only on the content body itself. When writing in Danish, follow Danish language rules - headers (h2, h3, etc.) should only capitalize the first word and proper nouns, not every word.'
              },
              {
                role: 'user',
                content: titlesPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 300
      });
      
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
        
        // Second OpenAI call - Replace with openaiService
        const keywordsData = await callOpenAI({
              model: 'gpt-4',
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
        });
          
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
        // Split the title into words and capitalize only the first word
        const words = title.split(' ');
        
        // Capitalize first word
        if (words.length > 0) {
          words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
        }
        
        // Keep the rest lowercase (proper nouns would need more sophisticated NLP)
        for (let i = 1; i < words.length; i++) {
          // Skip empty words
          if (!words[i]) continue;
          
          // Keep words lowercase unless they appear to be proper nouns
          // This is a simple heuristic - true NLP would be better
          const isPotentialProperNoun = (
            // Common proper noun markers for Danish
            words[i] === 'Danmark' || 
            words[i] === 'Dansk' || 
            words[i].endsWith('ske') || // For words like "danske"
            words[i].match(/^[A-ZÆØÅ]/) !== null // Already capitalized
          );
          
          words[i] = isPotentialProperNoun ? words[i] : words[i].toLowerCase();
        }
        
        return words.join(' ');
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
 * Fetches website content from the database
 * 
 * @param url The URL of the website (used for fallback content if DB query fails)
 * @param websiteId The ID of the website to fetch content for
 * @returns A promise that resolves to the website content
 */
export const fetchWebsiteContent = async (url: string, websiteId: string): Promise<string> => {
  console.log(`[aiService.fetchWebsiteContent] Fetching content for website ID: ${websiteId}`);
  
  try {
    if (!websiteId) {
      throw new Error('Website ID is required to fetch content');
    }
    
    // Directly query the website_content table for cornerstone content
    const { data: cornerstoneContent, error: cornerError } = await supabase
      .from('website_content')
      .select('content, title, url')
      .eq('website_id', websiteId)
      .eq('is_cornerstone', true)
      .order('updated_at', { ascending: false });
    
    if (cornerError) {
      console.error('Error fetching cornerstone content:', cornerError);
      throw new Error(`Database error: ${cornerError.message}`);
    }
    
    // If cornerstone content exists, concatenate it and return
    if (cornerstoneContent && cornerstoneContent.length > 0) {
      console.log(`Found ${cornerstoneContent.length} cornerstone content items for website ID: ${websiteId}`);
      
      // Combine all cornerstone content
      const combinedContent = cornerstoneContent
        .map(item => {
          return `
            ## ${item.title || 'Untitled Page'}
            ${item.content || ''}
            URL: ${item.url || ''}
          `.trim();
        })
        .join('\n\n');
      
      console.log(`Combined cornerstone content (${combinedContent.length} characters)`);
      console.log('Content preview:', combinedContent.substring(0, 100) + '...');
      
      return combinedContent;
    }
    
    // If no cornerstone content, try to get any content
    console.log('No cornerstone content found, fetching any content for the website');
    const { data: anyContent, error: anyError } = await supabase
      .from('website_content')
      .select('content, title, url')
      .eq('website_id', websiteId)
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (anyError) {
      console.error('Error fetching any content:', anyError);
      throw new Error(`Database error: ${anyError.message}`);
    }
    
    if (anyContent && anyContent.length > 0) {
      console.log(`Found ${anyContent.length} content items for website ID: ${websiteId}`);
      
      // Combine all content
      const combinedContent = anyContent
        .map(item => {
          return `
            ## ${item.title || 'Untitled Page'}
            ${item.content || ''}
            URL: ${item.url || ''}
          `.trim();
        })
        .join('\n\n');
      
      console.log(`Combined content (${combinedContent.length} characters)`);
      console.log('Content preview:', combinedContent.substring(0, 100) + '...');
      
      return combinedContent;
    }
    
    // If still no content, fall back to mock content
    console.warn('⚠️ No content found in database, using fallback mock content!');
    
    // Extract domain for domain-specific content
    const domain = url.replace(/https?:\/\//, '').split('.')[0].toLowerCase();
    console.log(`Extracted domain for fallback content: ${domain}`);
    
    let mockContent = '';
    
    // Domain-specific content fallbacks
    if (domain === 'workforceu') {
      console.log('Using WorkForceEU specific mock content');
      mockContent = `
        WorkForceEU is a leading platform for workforce management and HR solutions in Europe.
        We provide comprehensive services for recruitment, talent management, and workforce optimization.
        Our expertise includes temporary staffing, permanent placement, and workforce consulting.
        We help businesses find the right talent and manage their workforce efficiently.
        Topics include recruitment strategies, HR management, talent acquisition, and workforce planning.
        We specialize in providing flexible staffing solutions for businesses of all sizes.
        Our workforce consultants have deep expertise in European labor regulations and best practices.
        Working with WorkForceEU means accessing a wide network of pre-vetted talent.
      `;
    } else if (domain === 'predicthire') {
      console.log('Using PredictHire specific mock content');
      mockContent = `
        PredictHire is an AI-powered recruitment platform that helps businesses make better hiring decisions.
        Our technology uses predictive analytics to identify the best candidates for your organization.
        We offer solutions for candidate screening, assessment, and selection.
        Our platform reduces bias in the hiring process and improves the quality of hires.
        Topics include AI in recruitment, candidate experience, hiring efficiency, and talent analytics.
      `;
    } else if (url.includes('wordpress')) {
      console.log('Using WordPress specific mock content');
      mockContent = `
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
      console.log(`Using generic mock content for domain: ${domain}`);
      mockContent = `
        This is a website about ${domain} and related topics.
        We provide valuable information, resources, and services in this field.
        Our content covers best practices, industry trends, and practical advice.
        Topics include digital marketing, content strategy, SEO, and online presence optimization.
        Our goal is to help you succeed in the digital landscape with expert guidance.
        Web development trends change rapidly, and we keep you updated on the latest technologies.
        Content creation is a key component of any successful digital marketing strategy.
        SEO best practices help ensure your content reaches your target audience.
      `;
    }
    
    console.log(`Generated ${mockContent.length} characters of mock content for ${domain}`);
    console.log('Mock content preview:', mockContent.substring(0, 100).trim() + '...');
    
    return mockContent;
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

/**
 * Extracts potential links from website content
 * 
 * @param content The website content to extract links from
 * @returns Array of potential links with titles and URLs
 */
const extractPotentialLinks = async (websiteId: string): Promise<{ title: string, url: string }[]> => {
  try {
    console.log('Fetching potential internal links for website ID:', websiteId);
    
    // Query the website_content table to get actual pages for this website
    const { data, error } = await supabase
      .from('website_content')
      .select('title, url, content_type')
      .eq('website_id', websiteId)
      .eq('is_cornerstone', true) // Prioritize cornerstone content
      .order('last_fetched', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching website content for internal links:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No website content found for internal links');
      
      // If no cornerstone content, try getting any content
      const { data: allContent, error: allError } = await supabase
        .from('website_content')
        .select('title, url, content_type')
        .eq('website_id', websiteId)
        .order('last_fetched', { ascending: false })
        .limit(10);
      
      if (allError || !allContent || allContent.length === 0) {
        console.log('No website content found at all');
        return [];
      }
      
      // Format the content data into the expected format
      return allContent.map(item => ({
        title: item.title || 'Untitled page',
        url: item.url || '#'
      }));
    }
    
    // Format the content data into the expected format
    return data.map(item => ({
      title: item.title || 'Untitled page',
      url: item.url || '#'
    }));
  } catch (error) {
    console.error('Error extracting potential links:', error);
    return [];
  }
};

/**
 * Applies a WordPress template to the generated content
 * 
 * @param content The raw generated content
 * @param template The WordPress template to apply
 * @param title The post title
 * @returns The formatted content
 */
const applyWordPressTemplate = (content: string, template: string, title: string): string => {
  // If the template is empty or just basic, return the content directly
  if (!template || template.trim().length === 0 || !template.includes('entry-content')) {
    console.log('Using raw content without template application');
    return content;
  }
  
  console.log('Applying WordPress template...');
  
  // Clean up any extra whitespace from the content
  const cleanContent = content.trim();
  
  // Remove any unwanted WordPress elements that might have been included in the generated content
  let processedContent = cleanContent;
  
  // Look for and remove any accidental post title that might be generated at the beginning
  if (processedContent.includes(`<h1`) || processedContent.includes(`<H1`)) {
    console.log('Removing H1 title that was accidentally included in generated content');
    processedContent = processedContent.replace(/<h1[^>]*>.*?<\/h1>/i, '').trim();
  }
  
  // Remove common WordPress metadata patterns that might be accidentally included
  const metadataPatterns = [
    /Posted (on|by)[^<]+/gi,
    /Posted in[^<]+/gi,
    /Tagged with[^<]+/gi,
    /<div[^>]*class="(meta|entry-meta)"[^>]*>.*?<\/div>/gi
  ];
  
  metadataPatterns.forEach(pattern => {
    if (processedContent.match(pattern)) {
      console.log(`Removing WordPress metadata pattern: ${pattern}`);
      processedContent = processedContent.replace(pattern, '').trim();
    }
  });
  
  // Create a temporary DOM element to parse the template
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = template;
  
  // Find the entry-content div in the template
  const entryContentDiv = tempDiv.querySelector('.entry-content');
  
  if (entryContentDiv) {
    // Replace the content inside the entry-content div
    entryContentDiv.innerHTML = processedContent;
    
    // If there's a title element in the template, update it
    const titleElement = tempDiv.querySelector('.entry-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
    
    // Return the complete template with the content
    return tempDiv.innerHTML;
  } else {
    // If no entry-content div found, wrap the content in a basic article structure
    console.warn('No entry-content div found in template, using basic article structure');
    return `<article class="post">
      <div class="entry-content">
        ${processedContent}
      </div>
    </article>`;
  }
};

/**
 * Generates a blog post with AI based on title, keywords, writing style and website content
 * Includes backlinks to existing website content when relevant
 * 
 * @param title The post title
 * @param keywords The keywords to include
 * @param writingStyle The writing style preferences
 * @param websiteContent The existing website content to reference and create backlinks to
 * @param wpTemplate Optional WordPress HTML template to format the content
 * @returns A promise that resolves to the generated post content
 */
export const generatePostContent = async (
  title: string,
  keywords: string[],
  writingStyle: string,
  websiteContent: string,
  websiteId: string,
  wpTemplate?: string
): Promise<string> => {
  try {
    console.log('Generating post content with AI...');
    console.log('Title:', title);
    console.log('Keywords:', keywords);
    console.log('Writing Style:', writingStyle);
    console.log('Content length:', websiteContent.length);
    console.log('Website ID:', websiteId);
    console.log('WordPress Template:', wpTemplate);

    // Get website language from the database
    let contentLanguage = 'en'; // Default to English
    try {
      const { data: websiteData } = await supabase
        .from('websites')
        .select('language')
        .eq('id', websiteId)
        .single();
        
      if (websiteData?.language) {
        contentLanguage = websiteData.language.toLowerCase();
        console.log(`Website language from database: ${contentLanguage}`);
      }
    } catch (err) {
      console.log('Could not retrieve website language from database:', err);
    }

    // Extract potential links from website content in the database
    const potentialLinks = await extractPotentialLinks(websiteId);
    console.log('Potential backlinks found:', potentialLinks);
    
    // Try to use the OpenAI API through the free fetch proxy
    try {
      const contentPrompt = `
        Write a high-quality WordPress blog post with the title:
        "${title}"
        
        Writing Style: ${writingStyle || 'Professional and informative'}
        Keywords to include: ${keywords.join(', ')}
        Language: ${contentLanguage}
        
        Website Content Summary (to reference and link back to where relevant): 
        ${websiteContent.substring(0, 1500)}
        
        Potential internal links to include (only use if relevant to the content):
        ${potentialLinks.map(link => `- ${link.title}: ${link.url}`).join('\n')}
        
        The content should:
        1. Have an engaging introduction that hooks the reader
        2. Include 3-5 main sections with descriptive subheadings
        3. Incorporate the keywords naturally throughout the text
        4. Include 2-3 internal links to other content on the website (using the provided potential links)
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
        Use internal links with anchor text that flows naturally in the content.
      `;
      
      // Use the new openaiService instead of direct FREE_FETCH_PROXY
      const data = await callOpenAI({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a professional WordPress content creator who writes engaging, SEO-friendly blog posts with proper HTML formatting. 
            NEVER include WordPress theme elements like post titles, dates, authors, categories, or tags in your content. 
            Focus only on the content body itself. 
            When writing in Danish, follow Danish language rules - headers (h2, h3, etc.) should only capitalize the first word and proper nouns, not every word.
            Structure your content with proper HTML elements:
            - Use <h2> for main section headings
            - Use <h3> for subsections
            - Use <p> for paragraphs
            - Use <ul> and <li> for unordered lists
            - Use <ol> and <li> for ordered lists
            - Use <blockquote> for quotes
            - Use <strong> for emphasis
            - Use <em> for italics
            - Use <a> for links
            - Use <br> sparingly and only within paragraphs
            - Do not use <div> or other structural elements as they are handled by the WordPress theme`
          },
          {
            role: 'user',
            content: contentPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      });
      
      console.log('AI response for content generation:', data);
      
      if (data.choices && data.choices.length > 0) {
        let generatedContent = data.choices[0].message.content;
        
        // Apply WordPress template if provided
        if (wpTemplate && wpTemplate.trim().length > 0) {
          generatedContent = applyWordPressTemplate(generatedContent, wpTemplate, title);
        }
        
        return generatedContent;
      } else {
        throw new Error('No content generated from AI service');
      }
    } catch (apiError) {
      console.error('Error calling OpenAI API:', apiError);
      throw new Error('Failed to generate content with AI. Please try again later.');
    }
  } catch (error) {
    console.error('Error generating post content:', error);
    throw new Error('Failed to generate post content');
  }
};

/**
 * Ensures that cornerstone content exists for a website
 * If no cornerstone content is found, it will set up default content based on the website URL
 * 
 * @param websiteId The ID of the website to check
 * @param websiteUrl The URL of the website
 * @returns A promise that resolves when cornerstone content has been checked or set up
 */
export const ensureCornerstoneContent = async (websiteId: string, websiteUrl: string): Promise<void> => {
  console.log(`[aiService.ensureCornerstoneContent] Checking cornerstone content for website ID: ${websiteId}`);
  
  try {
    // First, check if cornerstone content exists
    const { data: existingContent, error: fetchError } = await supabase
      .from('website_content')
      .select('id')
      .eq('website_id', websiteId)
      .eq('is_cornerstone', true)
      .limit(1);
    
    if (fetchError) {
      console.error('Error checking cornerstone content:', fetchError);
      throw new Error(`Failed to check cornerstone content: ${fetchError.message}`);
    }
    
    // If cornerstone content exists, we're good
    if (existingContent && existingContent.length > 0) {
      console.log(`Cornerstone content already exists for website ID: ${websiteId}`);
      return;
    }
    
    console.log(`No cornerstone content found for website ID: ${websiteId}, creating default content...`);
    
    // Clean URL for display
    const cleanUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    const domain = cleanUrl.replace(/^https?:\/\//, '').split('.')[0].toLowerCase();
    
    // Generate domain-specific content
    let mockContent = '';
    let title = '';
    
    switch (domain) {
      case 'workforceu':
        title = 'WorkForceEU - Workforce Management and HR Solutions';
        mockContent = `
          WorkForceEU is a leading platform for workforce management and HR solutions in Europe.
          We provide comprehensive services for recruitment, talent management, and workforce optimization.
          Our expertise includes temporary staffing, permanent placement, and workforce consulting.
          We help businesses find the right talent and manage their workforce efficiently.
          Topics include recruitment strategies, HR management, talent acquisition, and workforce planning.
          We specialize in providing flexible staffing solutions for businesses of all sizes.
          Our workforce consultants have deep expertise in European labor regulations and best practices.
          Working with WorkForceEU means accessing a wide network of pre-vetted talent.
        `;
        break;
      case 'predicthire':
        title = 'PredictHire - AI-Powered Recruitment Platform';
        mockContent = `
          PredictHire is an AI-powered recruitment platform that helps businesses make better hiring decisions.
          Our technology uses predictive analytics to identify the best candidates for your organization.
          We offer solutions for candidate screening, assessment, and selection.
          Our platform reduces bias in the hiring process and improves the quality of hires.
          Topics include AI in recruitment, candidate experience, hiring efficiency, and talent analytics.
          PredictHire helps you save time and resources in your recruitment process.
          Our data-driven approach ensures you find candidates who are the best fit for your organization.
          We integrate with your existing HR systems to streamline your hiring workflow.
        `;
        break;
      default:
        title = `${domain.charAt(0).toUpperCase() + domain.slice(1)} - Digital Solutions`;
        mockContent = `
          This is a website about ${domain} and related topics.
          We provide valuable information, resources, and services in this field.
          Our content covers best practices, industry trends, and practical advice.
          Topics include digital marketing, content strategy, SEO, and online presence optimization.
          Our goal is to help you succeed in the digital landscape with expert guidance.
          We offer personalized solutions tailored to your specific needs and objectives.
          Our team of experts has years of experience in digital transformation and innovation.
          Contact us today to learn how we can help you achieve your goals.
        `;
    }
    
    // Insert cornerstone content
    const { error: insertError } = await supabase
      .from('website_content')
      .insert({
        website_id: websiteId,
        url: cleanUrl,
        title: title,
        content: mockContent.trim(),
        content_type: 'text',
        is_cornerstone: true,
        last_fetched: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          source: 'auto-generated',
          importance: 'high'
        }
      });
    
    if (insertError) {
      console.error('Error creating cornerstone content:', insertError);
      throw new Error(`Failed to create cornerstone content: ${insertError.message}`);
    }
    
    console.log(`Successfully created cornerstone content for website ID: ${websiteId}`);
  } catch (error) {
    console.error('Error in ensureCornerstoneContent:', error);
    throw error;
  }
}; 