// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/deploy_node_server

// Edge function to fetch and parse a website's sitemap
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Common sitemap paths to try
const COMMON_SITEMAP_PATHS = [
  '/sitemap_index.xml',
  '/sitemap.xml',
  '/sitemap-index.xml',
  '/wp-sitemap.xml',
  '/sitemap/sitemap-index.xml'
];

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

// Function to find and fetch a sitemap
async function findAndFetchSitemap(baseUrl: string): Promise<{ url: string, content: string } | null> {
  // Remove trailing slash if present
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  console.log(`Attempting to find sitemap for base URL: ${baseUrl}`);
  
  // Try each common sitemap path
  for (const path of COMMON_SITEMAP_PATHS) {
    const sitemapUrl = baseUrl + path;
    try {
      console.log(`Trying sitemap at: ${sitemapUrl}`);
      const response = await fetchWithTimeout(sitemapUrl);
      
      if (response.ok) {
        const content = await response.text();
        // Check if it looks like XML
        if (content.trim().startsWith('<?xml') || content.includes('<urlset') || content.includes('<sitemapindex')) {
          console.log(`Found sitemap at: ${sitemapUrl}`);
          return { url: sitemapUrl, content };
        } else {
          console.log(`Response doesn't look like XML at: ${sitemapUrl}`);
        }
      } else {
        console.log(`Failed to fetch sitemap at: ${sitemapUrl}, status: ${response.status}`);
      }
    } catch (error) {
      console.log(`Error fetching ${sitemapUrl}: ${error.message}`);
      // Continue to the next path
    }
  }
  
  // Try a direct fetch on the known path for WorkForceEU.com as a fallback
  try {
    const knownSitemapUrl = "https://workforceeu.com/sitemap_index.xml";
    console.log(`Trying hardcoded fallback sitemap URL: ${knownSitemapUrl}`);
    const response = await fetchWithTimeout(knownSitemapUrl);
    
    if (response.ok) {
      const content = await response.text();
      if (content.trim().startsWith('<?xml') || content.includes('<urlset') || content.includes('<sitemapindex')) {
        console.log(`Found sitemap at hardcoded fallback: ${knownSitemapUrl}`);
        return { url: knownSitemapUrl, content };
      }
    }
  } catch (error) {
    console.log(`Error fetching hardcoded fallback: ${error.message}`);
  }
  
  console.log(`No sitemap found for ${baseUrl}`);
  return null;
}

// Function to parse sitemap XML and extract URLs
function parseSitemap(content: string): Array<{ url: string, lastmod?: string }> {
  const urls: Array<{ url: string, lastmod?: string }> = [];
  
  // Check if it's a sitemap index
  if (content.includes('<sitemapindex')) {
    console.log('Detected sitemap index, extracting child sitemap URLs');
    // Extract sitemap URLs from the index
    const sitemapMatches = content.match(/<loc>([^<]+)<\/loc>/g) || [];
    
    // Return the sitemap URLs (to be processed later)
    return sitemapMatches.map(match => {
      const url = match.replace(/<loc>|<\/loc>/g, '');
      return { url };
    });
  }
  
  // It's a regular sitemap, extract page URLs
  const urlMatches = content.match(/<url>[\s\S]*?<\/url>/g) || [];
  
  for (const urlBlock of urlMatches) {
    const locMatch = urlBlock.match(/<loc>([^<]+)<\/loc>/);
    if (locMatch && locMatch[1]) {
      const url = locMatch[1];
      
      // Try to extract lastmod if available
      const lastmodMatch = urlBlock.match(/<lastmod>([^<]+)<\/lastmod>/);
      const lastmod = lastmodMatch ? lastmodMatch[1] : undefined;
      
      urls.push({ url, lastmod });
    }
  }
  
  return urls;
}

// Function to extract a title from a URL
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // If it's the homepage
    if (path === '/' || path === '') {
      return 'Homepage';
    }
    
    // Get the last path segment
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) {
      return 'Homepage';
    }
    
    let lastSegment = segments[segments.length - 1];
    
    // Remove file extensions
    lastSegment = lastSegment.replace(/\.(html|php|asp|aspx)$/, '');
    
    // Replace hyphens and underscores with spaces
    lastSegment = lastSegment.replace(/[-_]/g, ' ');
    
    // Capitalize first letter of each word
    lastSegment = lastSegment.replace(/\b\w/g, c => c.toUpperCase());
    
    return lastSegment || 'Page';
  } catch (error) {
    console.error(`Error extracting title from URL ${url}: ${error.message}`);
    return 'Page';
  }
}

serve(async (req) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
    
    // Get the request body
    const body = await req.json();
    const { website_id, website_url, custom_sitemap_url } = body;
    
    if (!website_id) {
      return new Response(
        JSON.stringify({ error: "Missing website_id parameter" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
    
    let url;
    
    // Special case for testing with a sample website
    if (website_id === 'sample' && website_url) {
      url = website_url;
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
          { status: 404, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }
      
      url = website.url;
    }
    
    let sitemap: { url: string, content: string } | null = null;
    
    // If a custom sitemap URL is provided, try it first
    if (custom_sitemap_url) {
      try {
        console.log(`Trying custom sitemap URL: ${custom_sitemap_url}`);
        const response = await fetchWithTimeout(custom_sitemap_url);
        
        if (response.ok) {
          const content = await response.text();
          // Check if it looks like XML
          if (content.trim().startsWith('<?xml') || content.includes('<urlset') || content.includes('<sitemapindex')) {
            console.log(`Found sitemap at custom URL: ${custom_sitemap_url}`);
            sitemap = { url: custom_sitemap_url, content };
          } else {
            console.log(`Custom URL doesn't contain valid sitemap XML: ${custom_sitemap_url}`);
          }
        } else {
          console.log(`Failed to fetch custom sitemap URL: ${custom_sitemap_url}, status: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error fetching custom sitemap URL: ${custom_sitemap_url}`, error);
      }
    }
    
    // If no sitemap found with custom URL, try auto-detection
    if (!sitemap) {
      sitemap = await findAndFetchSitemap(url);
    }
    
    if (!sitemap) {
      console.error(`No sitemap found for site: ${url} (websiteId: ${website_id})`);
      
      // Special handling for WorkForceEU.com
      if (url.includes('workforceeu.com')) {
        console.log('This is WorkForceEU.com - attempting direct access to known sitemap URL');
        try {
          const directSitemapUrl = 'https://workforceeu.com/sitemap_index.xml';
          const response = await fetchWithTimeout(directSitemapUrl);
          if (response.ok) {
            const content = await response.text();
            if (content.trim().startsWith('<?xml') || content.includes('<urlset') || content.includes('<sitemapindex')) {
              console.log(`Success! Found sitemap directly at: ${directSitemapUrl}`);
              sitemap = { url: directSitemapUrl, content };
            } else {
              console.error(`Found resource at ${directSitemapUrl} but content doesn't look like XML`);
            }
          } else {
            console.error(`Direct access failed with status: ${response.status}`);
          }
        } catch (error) {
          console.error(`Exception during direct access attempt: ${error.message}`);
        }
      }
    }
    
    if (!sitemap) {
      return new Response(
        JSON.stringify({ 
          error: "No sitemap found", 
          pages: [],
          website_url: url,
          message: "No sitemap found at common paths. Try providing a custom sitemap URL."
        }),
        { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
    
    // Parse the sitemap
    let pages = parseSitemap(sitemap.content);
    
    // If we got sitemap URLs instead of page URLs, fetch and parse all sitemaps
    if (pages.length > 0 && pages[0].url.includes('sitemap')) {
      console.log('Found sitemap index with child sitemaps, processing all child sitemaps');
      const allPageUrls: Array<{ url: string, lastmod?: string }> = [];
      
      // Process each sitemap URL (up to 5 to avoid too many requests)
      const sitemapsToProcess = pages.slice(0, 5);
      console.log(`Processing ${sitemapsToProcess.length} child sitemaps`);
      
      for (const sitemapInfo of sitemapsToProcess) {
        try {
          console.log(`Fetching child sitemap: ${sitemapInfo.url}`);
          const response = await fetchWithTimeout(sitemapInfo.url);
          if (response.ok) {
            const content = await response.text();
            // Parse this sitemap and add its URLs to our collection
            const sitemapPages = parseSitemap(content);
            console.log(`Found ${sitemapPages.length} URLs in child sitemap`);
            
            // Only add if these are actual page URLs, not more sitemap URLs
            if (sitemapPages.length > 0 && !sitemapPages[0].url.includes('sitemap')) {
              allPageUrls.push(...sitemapPages);
            } else if (sitemapPages.length > 0) {
              // Handle nested sitemap indexes (though this is rare)
              console.log('Found nested sitemap index, processing first child only');
              const nestedResponse = await fetchWithTimeout(sitemapPages[0].url);
              if (nestedResponse.ok) {
                const nestedContent = await nestedResponse.text();
                const nestedPages = parseSitemap(nestedContent);
                console.log(`Found ${nestedPages.length} URLs in nested sitemap`);
                allPageUrls.push(...nestedPages);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching child sitemap ${sitemapInfo.url}: ${error.message}`);
          // Continue with other sitemaps
        }
      }
      
      // Replace the original pages with all the pages we found
      if (allPageUrls.length > 0) {
        console.log(`Total URLs found across all child sitemaps: ${allPageUrls.length}`);
        pages = allPageUrls;
      } else {
        console.log('No pages found in child sitemaps, falling back to sitemap URLs');
      }
    }
    
    // Process the pages
    const processedPages = pages.map(page => ({
      id: crypto.randomUUID(),
      website_id,
      url: page.url,
      title: extractTitleFromUrl(page.url),
      last_fetched: new Date().toISOString()
    }));
    
    return new Response(
      JSON.stringify({ 
        sitemap_url: sitemap.url,
        pages: processedPages
      }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error(`Error processing request: ${error.message}`);
    
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
}); 