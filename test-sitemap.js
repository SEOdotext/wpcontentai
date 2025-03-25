// Test script for sitemap handling
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSitemap() {
  console.log('Testing sitemap function with lejfesten.dk...');
  
  try {
    // Call the Edge Function with a custom sitemap URL
    const { data, error } = await supabase.functions.invoke('get-sitemap-pages', {
      body: { 
        website_id: 'sample',
        website_url: 'https://lejfesten.dk',
        custom_sitemap_url: 'https://lejfesten.dk/sitemap_index.xml'
      }
    });
    
    if (error) {
      console.error('Error calling function:', error);
      return;
    }
    
    if (data.error) {
      console.error('Function returned error:', data.error);
      console.log('Message:', data.message);
      return;
    }
    
    console.log(`Success! Found ${data.pages?.length || 0} pages from sitemap at ${data.sitemap_url}`);
    
    // Print the first 5 pages
    if (data.pages && data.pages.length > 0) {
      console.log('\nFirst 5 pages:');
      data.pages.slice(0, 5).forEach((page, index) => {
        console.log(`${index + 1}. ${page.title} - ${page.url}`);
      });
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

// Run the test
testSitemap(); 