// Test script for the get-sitemap-pages Edge Function
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://vehcghewfnjkwlwmmrix.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaGNnaGV3Zm5qa3dsd21tcml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNDQzODMsImV4cCI6MjA1NjgyMDM4M30.EOH52BJNUdvWQ66htgH4oAvXA6C9-VySeC21qqKcKsY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Create a readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test with a sample website
async function testWithSampleWebsite() {
  // For testing, we'll use wordpress.org which definitely has a sitemap
  const { data, error } = await supabase.functions.invoke('get-sitemap-pages', {
    body: { website_id: 'sample', website_url: 'https://wordpress.org' }
  });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data.error) {
    console.error('Function error:', data.error);
    return;
  }
  
  console.log('Sitemap URL:', data.sitemap_url);
  console.log(`Found ${data.pages.length} pages`);
  
  // Print the first 3 pages
  console.log('Sample pages:');
  data.pages.slice(0, 3).forEach((page, index) => {
    console.log(`${index + 1}. ${page.title} - ${page.url}`);
  });
}

// Test with a custom sitemap URL
async function testWithCustomSitemapUrl() {
  // For testing, we'll use a direct sitemap URL
  const { data, error } = await supabase.functions.invoke('get-sitemap-pages', {
    body: { 
      website_id: 'sample', 
      website_url: 'https://example.com', 
      custom_sitemap_url: 'https://wordpress.org/sitemap.xml'
    }
  });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data.error) {
    console.error('Function error:', data.error);
    return;
  }
  
  console.log('Custom Sitemap URL:', data.sitemap_url);
  console.log(`Found ${data.pages.length} pages`);
  
  // Print the first 3 pages
  console.log('Sample pages:');
  data.pages.slice(0, 3).forEach((page, index) => {
    console.log(`${index + 1}. ${page.title} - ${page.url}`);
  });
}

// Main function
async function main() {
  console.log('1. Testing get-sitemap-pages function with auto-detection...');
  await testWithSampleWebsite();
  
  console.log('\n2. Testing get-sitemap-pages function with custom sitemap URL...');
  await testWithCustomSitemapUrl();
  
  rl.close();
}

main().catch(err => {
  console.error('Exception:', err.message);
  rl.close();
}); 