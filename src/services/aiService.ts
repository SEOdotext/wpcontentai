import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { callOpenAI } from '@/services/openaiService';
import { supabase } from '@/integrations/supabase/client';
import { languages } from '@/data/languages';
import { PostTheme } from '@/types/database';
import { useWebsites } from '@/contexts/WebsitesContext';

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
 * @param websiteId The ID of the website
 * @returns A promise that resolves to an array of title suggestions
 */
export const generateTitleSuggestions = async (
  content: string,
  keywords: string[],
  writingStyle: string,
  subjectMatters: string[],
  websiteId: string
): Promise<{
  titles: string[];
  keywords: string[];
  keywordsByTitle: { [title: string]: string[] };
  categories: string[];
  categoriesByTitle: { [title: string]: string[] };
}> => {
  try {
    console.log('Generating title suggestions with AI...');
    console.log('Keywords:', keywords);
    console.log('Writing Style:', writingStyle);
    console.log('Subject Matters:', subjectMatters);
    
    if (!websiteId) {
      throw new Error('Website ID is required');
    }

    // Call the edge function
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No access token found');
    }

    const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-post-ideas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        website_id: websiteId,
        keywords,
        writing_style: writingStyle,
        subject_matters: subjectMatters
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate title suggestions');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to generate title suggestions');
    }

    return {
      titles: result.titles,
      keywords: result.keywords,
      keywordsByTitle: result.keywordsByTitle,
      categories: result.categories || [],
      categoriesByTitle: result.categoriesByTitle || {}
    };

  } catch (error) {
    console.error('Error generating title suggestions with AI:', error);
    throw error;
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
    
    // If no content is found, throw an error
    throw new Error('No content found in database. Please ensure the website has content before generating posts.');
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
const applyformattemplate = (content: string, template: string, title: string): string => {
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
  
  // Find the main content div to replace in the template
  const contentMatch = template.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  
  if (contentMatch) {
    // Replace only the content inside the entry-content div
    console.log('Found entry-content div in template, inserting content');
    return template.replace(
      contentMatch[0],
      `<div class="entry-content">${processedContent}</div>`
    );
  } else {
    // If no entry-content div found, just use the generated content
    console.warn('No entry-content div found in template, using processed content directly');
    return processedContent;
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
 * @param postThemeId Optional postThemeId to update in the database
 * @returns A promise that resolves to the generated post content
 */
export const generatePostContent = async (
  title: string,
  keywords: string[],
  writingStyle: string,
  websiteContent: string,
  websiteId: string,
  wpTemplate?: string,
  postThemeId?: string
): Promise<string> => {
  try {
    console.log('Generating post content with AI...');
    console.log('Title:', title);
    console.log('Keywords:', keywords);
    console.log('Writing Style:', writingStyle);
    console.log('Content length:', websiteContent.length);
    console.log('Website ID:', websiteId);
    if (postThemeId) {
      console.log('Post Theme ID:', postThemeId);
    }
    
    // Basic language detection for various languages
    const languageDetectors = {
      'da': { // Danish
        words: ['og', 'at', 'en', 'den', 'til', 'er', 'det', 'som', 'på', 'med', 'har', 'af', 'for', 'ikke', 'der', 'var'],
        characters: ['æ', 'ø', 'å', 'Æ', 'Ø', 'Å'],
        phrases: ['danmark', 'københavn', 'dansk']
      },
      'es': { // Spanish
        words: ['y', 'el', 'la', 'de', 'en', 'que', 'es', 'por', 'un', 'una', 'para', 'con', 'no', 'está'],
        characters: ['ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '¡'],
        phrases: ['españa', 'méxico', 'español']
      },
      'fr': { // French
        words: ['et', 'le', 'la', 'les', 'un', 'une', 'des', 'en', 'dans', 'est', 'sont', 'pour', 'avec', 'nous'],
        characters: ['é', 'è', 'ê', 'à', 'â', 'ç', 'ù', 'û', 'ï', 'œ'],
        phrases: ['france', 'français', 'paris']
      },
      'de': { // German
        words: ['und', 'der', 'die', 'das', 'in', 'ist', 'für', 'mit', 'nicht', 'auch', 'von', 'zu', 'eine', 'ich'],
        characters: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
        phrases: ['deutschland', 'deutsch', 'berlin']
      },
      'it': { // Italian
        words: ['e', 'il', 'la', 'di', 'che', 'in', 'un', 'una', 'non', 'per', 'sono', 'con', 'come', 'questo'],
        characters: ['à', 'è', 'é', 'ì', 'í', 'ò', 'ó', 'ù', 'ú'],
        phrases: ['italia', 'italiano', 'roma', 'milano']
      },
      'nl': { // Dutch
        words: ['en', 'het', 'de', 'van', 'een', 'in', 'is', 'op', 'dat', 'niet', 'voor', 'zijn', 'met', 'ook'],
        characters: ['ij', 'é', 'ë', 'ö', 'ü', 'ä'],
        phrases: ['nederland', 'amsterdam', 'nederlands']
      },
      'pt': { // Portuguese
        words: ['e', 'o', 'a', 'de', 'que', 'em', 'um', 'uma', 'não', 'para', 'com', 'se', 'como', 'os'],
        characters: ['á', 'à', 'â', 'ã', 'ç', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú'],
        phrases: ['brasil', 'portugal', 'português']
      },
      'sv': { // Swedish
        words: ['och', 'att', 'det', 'i', 'en', 'är', 'på', 'för', 'med', 'som', 'inte', 'av', 'till', 'den'],
        characters: ['å', 'ä', 'ö', 'Å', 'Ä', 'Ö'],
        phrases: ['sverige', 'stockholm', 'svenska']
      },
      'no': { // Norwegian
        words: ['og', 'i', 'det', 'er', 'på', 'at', 'en', 'for', 'som', 'med', 'til', 'av', 'ikke', 'å'],
        characters: ['æ', 'ø', 'å', 'Æ', 'Ø', 'Å'],
        phrases: ['norge', 'oslo', 'norsk']
      },
      'fi': { // Finnish
        words: ['ja', 'on', 'että', 'ei', 'se', 'hän', 'ovat', 'mitä', 'tämä', 'mutta', 'ole', 'kun', 'minä', 'sinä'],
        characters: ['ä', 'ö', 'å', 'Ä', 'Ö', 'Å'],
        phrases: ['suomi', 'helsinki', 'suomalainen']
      },
      'pl': { // Polish
        words: ['i', 'w', 'na', 'z', 'do', 'że', 'to', 'nie', 'się', 'jest', 'o', 'a', 'jak', 'po'],
        characters: ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż', 'Ą', 'Ć', 'Ę', 'Ł', 'Ń', 'Ó', 'Ś', 'Ź', 'Ż'],
        phrases: ['polska', 'warszawa', 'polski']
      },
      'ru': { // Russian
        words: ['и', 'в', 'на', 'с', 'не', 'что', 'это', 'я', 'он', 'а', 'то', 'все', 'как', 'но'],
        characters: ['а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ы', 'ь', 'э', 'ю', 'я'],
        phrases: ['россия', 'москва', 'русский']
      },
      'ar': { // Arabic
        words: ['و', 'في', 'من', 'إلى', 'على', 'أن', 'هذا', 'هي', 'هو', 'لا', 'ما', 'مع', 'كان', 'عن'],
        characters: ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ء', 'ة'],
        phrases: ['العربية', 'السعودية', 'مصر', 'القاهرة']
      },
      'zh': { // Chinese
        words: ['的', '是', '在', '不', '了', '有', '和', '人', '这', '中', '大', '为', '上', '个'],
        characters: ['中', '国', '人', '我', '的', '是', '在', '了', '有', '和', '不', '这', '他', '你'],
        phrases: ['中国', '北京', '上海', '汉语']
      },
      'ja': { // Japanese
        words: ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる'],
        characters: ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ', '日', '本', '人', '私', '見'],
        phrases: ['日本', '東京', '日本語']
      },
      'ko': { // Korean
        words: ['이', '가', '은', '는', '을', '를', '에', '의', '로', '와', '과', '한', '하다', '있다'],
        characters: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', '한', '국', '어', '서', '울'],
        phrases: ['한국', '서울', '한국어']
      },
      'hi': { // Hindi
        words: ['और', 'का', 'की', 'एक', 'में', 'है', 'यह', 'से', 'हैं', 'के', 'पर', 'इस', 'को', 'जो'],
        characters: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ', 'क', 'ख', 'ग', 'घ'],
        phrases: ['भारत', 'हिंदी', 'दिल्ली', 'मुंबई']
      }
    };

    // Helper function to detect language from text
    const detectLanguageFromText = (text: string): string | null => {
      // Convert text to lowercase for easier matching
      const lowerText = text.toLowerCase();
      
      // Check each language's markers
      for (const [langCode, detector] of Object.entries(languageDetectors)) {
        // Check for words
        if (detector.words.some(word => {
          // Match whole words only using word boundaries
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          return regex.test(lowerText);
        })) {
          return langCode;
        }
        
        // Check for special characters
        if (detector.characters.some(char => lowerText.includes(char))) {
          return langCode;
        }
        
        // Check for phrases
        if (detector.phrases.some(phrase => lowerText.includes(phrase))) {
          return langCode;
        }
      }
      
      return null; // No confident match
    };
    
    // Try to get website language from the database
    let websiteLanguage = 'unknown';
    try {
      // Check if websites table is accessible (handle type checking issues)
      const { data: tablesData } = await supabase
        .from('websites')
        .select('id')
        .limit(1);
      
      if (tablesData) {
        // Table exists and is accessible
        const { data: websiteData } = await supabase
          .from('websites')
          .select('*')
          .eq('id', websiteId)
          .single();
          
        if (websiteData) {
          // Try to get language field if it exists
          // @ts-ignore - Handle potential missing language field
          const language = websiteData.language || websiteData.default_language;
          if (language) {
            websiteLanguage = language.toLowerCase();
            console.log(`Website language from database: ${websiteLanguage}`);
          }
        }
      }
    } catch (err) {
      console.log('Could not retrieve website language from database:', err);
    }
    
    // Auto-detect language from text if no language is set in the database
    const detectedLanguage = websiteLanguage === 'unknown' ? detectLanguageFromText(title + ' ' + websiteContent.slice(0, 500)) : null;
    
    // Determine final language, defaulting to English if we can't detect
    const contentLanguage = websiteLanguage !== 'unknown' ? websiteLanguage : (detectedLanguage || 'en');
    
    console.log('Language detection results:', {
      websiteLanguage,
      detectedFromText: detectedLanguage,
      finalDetermination: contentLanguage
    });
    
    // Flag for Danish-specific formatting (and potentially other languages)
    const isDanish = contentLanguage === 'da' || contentLanguage === 'danish' || contentLanguage === 'dansk' || 
                    // Additional checks for Danish content detection
                    (title && (
                      title.includes('ø') || title.includes('æ') || title.includes('å') ||
                      title.includes('Ø') || title.includes('Æ') || title.includes('Å') ||
                      // Common Danish words that might appear in titles
                      title.includes(' og ') || title.includes(' i ') || title.includes(' til ') ||
                      title.includes(' af ') || title.includes(' med ') || title.includes(' på ')
                    ));
    
    console.log('Danish content detection:', isDanish);
    
    // If Danish is detected, ensure the title follows Danish capitalization rules
    if (isDanish && title) {
      // Log the original title
      console.log('Original title:', title);
      
      // Apply Danish capitalization rules (only first word capitalized)
      const words = title.split(' ');
      if (words.length > 0) {
        words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
        
        // Keep proper nouns capitalized, everything else lowercase
        for (let i = 1; i < words.length; i++) {
          if (!words[i]) continue;
          
          // Check if potentially a proper noun (very simple heuristic)
          const isPotentialProperNoun = (
            words[i] === 'Danmark' || 
            words[i] === 'Dansk' || 
            words[i].endsWith('ske') || // For words like "danske"
            words[i].match(/^[A-ZÆØÅ]/) !== null // Already capitalized
          );
          
          words[i] = isPotentialProperNoun ? words[i] : words[i].toLowerCase();
        }
        
        title = words.join(' ');
      }
      
      // Log the corrected title
      console.log('Corrected Danish title:', title);
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
        
        ${(() => {
          // Select language-specific instructions
          switch(contentLanguage) {
            case 'da':
              return `Since this content is in Danish, strictly follow Danish capitalization rules for headers:
              - Only capitalize the first word and proper nouns in headings (h2, h3, etc.)
              - NEVER capitalize every word in headers as is common in English
              - Proper nouns (like "Danmark", "København", etc.) should be capitalized
              - Common words like "og", "i", "til", "af", "med", "på" should NOT be capitalized unless they start a heading
              - Example correct heading: "De bedste metoder til at optimere din hjemmeside" (NOT "De Bedste Metoder Til At Optimere Din Hjemmeside")`;
            case 'de':
              return `Since this content is in German, follow German capitalization rules for headers:
              - Capitalize nouns and the first word of headlines
              - Follow German grammar rules for compound words`;
            case 'es':
            case 'fr':
            case 'it':
            case 'pt':
              return `Since this content is in ${languages.find(l => l.code === contentLanguage)?.name || contentLanguage}, follow appropriate capitalization rules:
              - Only capitalize the first word and proper nouns in headings
              - Do NOT capitalize every word in headers as is common in English`;
            case 'en':
              return `Since this content is in English, follow standard English capitalization for headers:
              - Capitalize all major words in headings (nouns, verbs, adjectives, adverbs)
              - Do not capitalize articles (a, an, the), coordinating conjunctions, or prepositions unless they are the first word`;
            case 'other':
              // Handle custom language code
              return `For this content in the specified language (${contentLanguage}), follow appropriate capitalization rules:
              - If you know the standard conventions for this language, follow those conventions
              - Otherwise, only capitalize the first word and proper nouns in headings
              - Ensure the content follows the grammatical rules of the target language`;
            default:
              // Check if this is one of our defined languages first
              const languageName = languages.find(l => l.code === contentLanguage)?.name;
              if (languageName) {
                return `For this content in ${languageName}, follow appropriate capitalization rules for the target language:
                - Follow standard conventions for ${languageName}
                - Ensure proper use of any special characters or grammatical rules specific to this language`;
              }
              
              // Truly unknown language code
              return `For this content, follow appropriate capitalization rules for the target language (${contentLanguage}):
              - If the language is like English, capitalize major words in headings
              - If the language is like most European languages, only capitalize the first word and proper nouns in headings
              - Follow any special capitalization rules specific to this language`;
          }
        })()}
      `;
      
      // Use the new openaiService instead of direct FREE_FETCH_PROXY
      const data = await callOpenAI({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional WordPress content creator who writes engaging, SEO-friendly blog posts with proper HTML formatting for our website blog. NEVER include WordPress theme elements like post titles, dates, authors, categories, or tags in your content. Focus only on the content body itself. When writing in Danish, follow Danish language rules - headers (h2, h3, etc.) should only capitalize the first word and proper nouns, not every word.'
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
          generatedContent = applyformattemplate(generatedContent, wpTemplate, title);
        }
        
        // Update the post_theme in the database if a postThemeId was provided
        if (postThemeId) {
          try {
            console.log('Updating post_theme in database with generated content for ID:', postThemeId);
            
            const updates: Partial<PostTheme> = { post_content: generatedContent };
            
            const { error } = await supabase
              .from('post_themes')
              .update(updates)
              .eq('id', postThemeId);
              
            if (error) {
              console.error('Error updating post_theme with generated content:', error);
            } else {
              console.log('Successfully updated post_theme with generated content in database');
            }
          } catch (dbError) {
            console.error('Exception updating post_theme with content:', dbError);
            // Don't throw this error - we still want to return the generated content
          }
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
    
    // Generic title and content
    title = `${domain.charAt(0).toUpperCase() + domain.slice(1)} - Our Services`;
    mockContent = `
      Welcome to our website.
      We provide valuable information and services.
      Our team is dedicated to helping our clients.
      We focus on delivering quality solutions.
      Our expertise helps businesses grow.
      We understand our clients' needs.
      Our services are tailored to each client.
      We build lasting relationships with our clients.
    `;
    
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