import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser, Element, Node } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebsiteContent {
  id: string;
  url: string;
  title: string;
  content: string;
  last_fetched: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { website_id } = await req.json();

    if (!website_id) {
      throw new Error('website_id is required');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all key content pages for the website
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

    // Process pages in batches to avoid overwhelming the server
    const batchSize = 5;
    const results: WebsiteContent[] = [];
    let processedCount = 0;

    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      
      // Process each page in the batch concurrently
      const batchPromises = batch.map(async (page) => {
        try {
          // Fetch the page content
          const response = await fetch(page.url);
          if (!response.ok) throw new Error(`Failed to fetch ${page.url}`);
          
          const html = await response.text();
          
          // Extract main content
          const cleanContent = extractMainContent(html);
          
          // Update the page with the scraped content
          const { error: updateError } = await supabaseClient
            .from('website_content')
            .update({
              content: cleanContent,
              last_fetched: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', page.id);

          if (updateError) {
            console.error(`Error updating page ${page.url}:`, updateError);
            return null;
          }

          processedCount++;
          return {
            id: page.id,
            url: page.url,
            title: page.title,
            content: cleanContent,
            last_fetched: new Date().toISOString()
          };
        } catch (error) {
          console.error(`Error processing page ${page.url}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((r): r is WebsiteContent => r !== null));
    }

    return new Response(
      JSON.stringify({
        message: `Successfully analyzed ${processedCount} of ${pages.length} pages`,
        pages: results,
        total: pages.length,
        processed: processedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
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
      '#header'
    ];

    elementsToRemove.forEach(selector => {
      doc.querySelectorAll(selector).forEach((node: Node) => {
        if (node instanceof Element) {
          node._remove();
        }
      });
    });

    // Try to find the main content container
    const mainContent = 
      doc.querySelector('article') || 
      doc.querySelector('main') || 
      doc.querySelector('.content') || 
      doc.querySelector('.post-content') ||
      doc.querySelector('.entry-content');

    if (mainContent) {
      return mainContent.textContent?.trim() || '';
    }

    // Fallback to body content if no main content container is found
    return doc.body.textContent?.trim() || '';
  } catch (error) {
    console.error('Error extracting content:', error);
    return '';
  }
} 