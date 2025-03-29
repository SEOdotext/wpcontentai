// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/deploy_node_server

// Edge function to crawl a website and extract pages when no sitemap is available
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

// Maximum number of pages to crawl
const MAX_PAGES = 50;

// Function to fetch a URL with error handling
async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WPContentAI/1.0; +https://wpcontentai.com)'
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
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
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://websitetexts.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get the request body
    const body = await req.json();
    const { website_id, max_pages } = body;
    
    if (!website_id) {
      return new Response(
        JSON.stringify({ error: "Missing website_id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    let url;
    
    // Special case for testing with a sample website
    if (website_id === 'sample' && body.website_url) {
      url = body.website_url;
      console.log(`Using provided sample URL: ${url}`);
    } else {
      // Create a Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Get the website URL from the database
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('url')
        .eq('id', website_id)
        .single();
      
      if (websiteError || !website) {
        return new Response(
          JSON.stringify({ error: websiteError?.message || "Website not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
    
    return new Response(
      JSON.stringify({ 
        crawl_url: url,
        pages: processedPages
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error(`Error processing request: ${error.message}`);
    
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}); 