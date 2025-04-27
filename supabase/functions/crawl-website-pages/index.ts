// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/deploy_node_server

// Edge function to crawl a website and extract pages when no sitemap is available
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

// Maximum number of pages to crawl
const MAX_PAGES = 50;

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

// Function to fetch a URL with error handling and retries
async function fetchWithTimeout(url: string, timeout = 10000, retries = 2): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ContentGardener/1.0; +https://contentgardener.ai)'
        }
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      lastError = error;
      
      // If not the last attempt, wait before retrying
      if (attempt < retries) {
        console.log(`Attempt ${attempt + 1} failed for ${url}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw lastError || new Error(`Failed to fetch ${url} after ${retries} retries`);
}

// Function to extract links from HTML content
function extractLinks(baseUrl: string, html: string): string[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (!doc) return [];

    const links: string[] = [];
    const domain = new URL(baseUrl).hostname;
    
    // Get all anchor tags
    const anchors = doc.querySelectorAll("a");
    for (const anchor of anchors) {
      let href = anchor.getAttribute("href");
      if (!href) continue;
      
      try {
        // Handle relative URLs
        if (href.startsWith("/")) {
          href = new URL(href, baseUrl).href;
        } else if (!href.startsWith("http")) {
          href = new URL(href, baseUrl).href;
        }
        
        const linkUrl = new URL(href);
        
        // Only include links from the same domain
        if (linkUrl.hostname === domain) {
          // Exclude common non-content URLs
          if (!shouldExcludeUrl(linkUrl.href)) {
            links.push(linkUrl.href);
          }
        }
      } catch (error) {
        console.log(`Error processing link ${href}: ${error.message}`);
      }
    }
    
    return [...new Set(links)]; // Remove duplicates
  } catch (error) {
    console.error(`Error extracting links: ${error.message}`);
    return [];
  }
}

// Function to extract title from HTML
function extractTitle(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (!doc) return "Untitled Page";
    
    const titleElement = doc.querySelector("title");
    if (titleElement && titleElement.textContent) {
      return titleElement.textContent.trim();
    }
    
    // Fallback to h1 if no title
    const h1Element = doc.querySelector("h1");
    if (h1Element && h1Element.textContent) {
      return h1Element.textContent.trim();
    }
    
    return "Untitled Page";
  } catch (error) {
    console.error(`Error extracting title: ${error.message}`);
    return "Untitled Page";
  }
}

// Function to determine if a URL should be excluded
function shouldExcludeUrl(url: string): boolean {
  // Common patterns to exclude
  const excludePatterns = [
    /\.(jpg|jpeg|png|gif|svg|webp|css|js|pdf|zip|rar|doc|docx|xls|xlsx|ppt|pptx)$/i,
    /\/(wp-admin|wp-includes|wp-content\/uploads|wp-json|wp-login|feed|comments|tag|category|author|attachment|cart|checkout|my-account|wp-comments-post)/i,
    /#comment/i,
    /\?s=/i, // Search queries
    /\?p=/i, // WordPress preview
    /\?replytocom=/i, // WordPress comment replies
  ];
  
  return excludePatterns.some(pattern => pattern.test(url));
}

// Function to crawl a website starting from the homepage
async function crawlWebsite(baseUrl: string, maxPages = MAX_PAGES): Promise<Array<{ url: string, title: string }>> {
  console.log(`Starting crawl of ${baseUrl}, max pages: ${maxPages}`);
  
  // Normalize the base URL
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  const visited = new Set<string>();
  const queue: string[] = [baseUrl];
  const pages: Array<{ url: string, title: string }> = [];
  
  // Process the queue until we reach the maximum number of pages or exhaust the queue
  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift()!;
    
    // Skip if already visited
    if (visited.has(url)) continue;
    visited.add(url);
    
    console.log(`Crawling ${url} (${pages.length + 1}/${maxPages})`);
    
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        console.log(`Failed to fetch ${url}, status: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const title = extractTitle(html);
      
      // Add to pages
      pages.push({ url, title });
      
      // Extract links and add to queue
      const links = extractLinks(baseUrl, html);
      for (const link of links) {
        if (!visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }
    } catch (error) {
      console.error(`Error crawling ${url}: ${error.message}`);
    }
  }
  
  console.log(`Crawl complete. Visited ${visited.size} URLs, found ${pages.length} pages.`);
  return pages;
}

serve(async (req) => {
  // Get the origin from the request
  const origin = req.headers.get('origin') || ALLOWED_ORIGINS.production[0];
  
  // Set CORS headers based on origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS.production[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  } as const;

  let requestBody: { website_id?: string; website_url?: string; max_pages?: string } = {};
  
  // Create Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  try {
    // Only allow POST requests
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }
    
    // Get the request body
    requestBody = await req.json();
    const { website_id, website_url, max_pages } = requestBody;
    
    if (!website_id) {
      throw new Error("Missing website_id parameter");
    }
    
    let url: string;
    
    if (website_url) {
      console.log(`Using provided website_url: ${website_url}`);
      url = website_url;
    } else if (website_id === 'sample' && requestBody.website_url) {
      url = requestBody.website_url;
      console.log(`Using provided sample URL: ${url}`);
    } else {
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('url')
        .eq('id', website_id)
        .single();
      
      if (websiteError || !website) {
        const errorMessage = websiteError ? websiteError.message : "Website not found";
        
        await supabase.from('onboarding').upsert({
          website_id,
          error: errorMessage,
          error_step: 'crawl-website-pages',
          status: 'error'
        });

        throw new Error(errorMessage);
      }
      
      url = website.url;
    }
    
    // Ensure URL has a protocol
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    // Crawl the website
    const maxPagesToFetch = max_pages && !isNaN(parseInt(max_pages)) ? parseInt(max_pages) : MAX_PAGES;
    const pages = await crawlWebsite(url, maxPagesToFetch);
    
    if (pages.length === 0) {
      // Log error to onboarding table
      await supabase.from('onboarding').upsert({
        website_id,
        error: `No pages found at URL: ${url}`,
        error_step: 'crawl-website-pages',
        status: 'error'
      });

      return new Response(
        JSON.stringify({ 
          error: "No pages found", 
          website_url: url,
          message: "Could not find any pages on the website."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Process the pages
    const processedPages = pages.map(page => ({
      id: crypto.randomUUID(),
      website_id,
      url: page.url,
      title: page.title,
      last_fetched: new Date().toISOString()
    }));

    // Clear any previous errors on success
    await supabase.from('onboarding').upsert({
      website_id,
      error: null,
      error_step: null,
      status: 'success'
    });
    
    return new Response(
      JSON.stringify({ 
        crawl_url: url,
        pages: processedPages
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error(`Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Log error to onboarding table
    try {
      await supabase.from('onboarding').upsert({
        website_id: requestBody?.website_id,
        error: `Error in crawl-website-pages: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error_step: 'crawl-website-pages',
        status: 'error'
      });
    } catch (logError) {
      console.error('Failed to log error to onboarding table:', logError instanceof Error ? logError.message : 'Unknown error');
    }
    
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}); 