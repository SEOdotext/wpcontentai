import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWebsites } from './WebsitesContext';
import { toast } from 'sonner';
import { useToast } from '@/components/ui/use-toast';
import { Database } from '@/integrations/supabase/types';

// Define the website content type based on the database schema
export type WebsiteContent = Database['public']['Tables']['website_content']['Row'] & {
  // Additional UI-only fields
  type?: 'page' | 'post' | 'custom';
  status?: 'published' | 'draft';
};

// Define the context type
interface WebsiteContentContextType {
  websiteContent: WebsiteContent[];
  loading: boolean;
  error: string | null;
  fetchWebsiteContent: (websiteId: string) => Promise<void>;
  addWebsiteContent: (content: Omit<WebsiteContent, 'id' | 'created_at' | 'updated_at'>) => Promise<WebsiteContent | null>;
  updateWebsiteContent: (id: string, updates: Partial<WebsiteContent>) => Promise<WebsiteContent | null>;
  deleteWebsiteContent: (id: string) => Promise<boolean>;
  fetchSitemapPages: (websiteId: string, customSitemapUrl?: string) => Promise<WebsiteContent[]>;
  importSitemapPages: (websiteId: string, customSitemapUrl?: string) => Promise<number>;
  crawlWebsitePages: (websiteId: string, maxPages?: number) => Promise<WebsiteContent[]>;
  importCrawledPages: (websiteId: string, maxPages?: number) => Promise<number>;
  setCornerstone: (contentId: string | null, websiteId: string) => Promise<boolean>;
  fixCornerstoneContent: () => Promise<string>;
  importPages: (websiteId: string, options: { 
    maxPages?: number, 
    customSitemapUrl?: string,
    useSitemap?: boolean 
  }) => Promise<number>;
  scrapeCornerstone: (websiteId: string) => Promise<number>;
}

// Create the context
const WebsiteContentContext = createContext<WebsiteContentContextType | undefined>(undefined);

// Create the provider component
export const WebsiteContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [websiteContent, setWebsiteContent] = useState<WebsiteContent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { websites } = useWebsites();
  const { toast } = useToast();

  // Fetch website content for a specific website
  const fetchWebsiteContent = async (websiteId: string) => {
    console.log(`fetchWebsiteContent called for website ID: ${websiteId}`);
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching content for website ID: ${websiteId}`);
      
      // Explicitly include is_cornerstone in the select statement
      const { data, error } = await supabase
        .from('website_content')
        .select('id, website_id, url, title, content, content_type, last_fetched, created_at, updated_at, metadata, is_cornerstone')
        .eq('website_id', websiteId);
      
      if (error) {
        console.error('Error fetching website content:', error);
        setError(error.message);
        toast({
          title: 'Error',
          description: `Failed to fetch website content: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }
      
      console.log(`Retrieved ${data.length} content items`);
      console.log('Content with is_cornerstone:', data.filter((item: any) => item.is_cornerstone));
      
      // Add default values for the optional fields
      const contentWithDefaults = data.map((item: any) => ({
        ...item,
        // Ensure is_cornerstone is a boolean
        is_cornerstone: item.is_cornerstone === true,
        // Determine type based on content_type
        type: item.type || (item.content_type === 'sitemap' || item.content_type === 'page' ? 'page' : 
               item.content_type === 'post' ? 'post' : 'custom'),
        // Default status to published
        status: item.status || 'published'
      }));
      
      console.log('Setting websiteContent state with', contentWithDefaults.length, 'items');
      setWebsiteContent(contentWithDefaults as WebsiteContent[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Exception fetching website content:', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to fetch website content: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new website content
  const addWebsiteContent = async (content: Omit<WebsiteContent, 'id' | 'created_at' | 'updated_at'>): Promise<WebsiteContent | null> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Adding new website content:', content);
      
      // Create a copy of the content object without the type and status fields
      const { type, status, ...dbContent } = content;
      
      // Ensure is_cornerstone is set to false by default if not provided
      const contentWithDefaults = {
        ...dbContent,
        is_cornerstone: dbContent.is_cornerstone === true ? true : false
      };
      
      const { data, error } = await supabase
        .from('website_content')
        .insert([contentWithDefaults])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding website content:', error);
        setError(error.message);
        toast({
          title: 'Error',
          description: `Failed to add website content: ${error.message}`,
          variant: 'destructive',
        });
        return null;
      }
      
      console.log('Successfully added website content:', data);
      
      // Update local state
      setWebsiteContent(prev => [...prev, data as WebsiteContent]);
      
      toast({
        title: 'Success',
        description: 'Website content added successfully',
      });
      
      return data as WebsiteContent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Exception adding website content:', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to add website content: ${errorMessage}`,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update existing website content
  const updateWebsiteContent = async (id: string, updates: Partial<WebsiteContent>): Promise<WebsiteContent | null> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Updating website content ID: ${id}`, updates);
      
      // Create a copy of the updates object without the type and status fields
      const { type, status, ...dbUpdates } = updates;
      
      // Log the update details
      console.log('Update details:', dbUpdates);
      
      const { data, error } = await supabase
        .from('website_content')
        .update({ ...dbUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating website content:', error);
        setError(error.message);
        toast({
          title: 'Error',
          description: `Failed to update website content: ${error.message}`,
          variant: 'destructive',
        });
        return null;
      }
      
      console.log('Successfully updated website content:', data);
      
      // Add the type and status back for UI purposes
      const updatedContent = {
        ...data,
        type: type || (data.content_type === 'sitemap' || data.content_type === 'page' ? 'page' : 
               data.content_type === 'post' ? 'post' : 'custom'),
        status: status || 'published'
      };
      
      // Update local state without reloading everything
      setWebsiteContent(prev => 
        prev.map(item => item.id === id ? updatedContent as WebsiteContent : item)
      );
      
      toast({
        title: 'Success',
        description: 'Website content updated successfully',
      });
      
      return updatedContent as WebsiteContent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Exception updating website content:', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to update website content: ${errorMessage}`,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete website content
  const deleteWebsiteContent = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Deleting website content ID: ${id}`);
      
      // First, check if the content exists
      const { data: existingContent, error: fetchError } = await supabase
        .from('website_content')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching content to delete:', fetchError);
        setError(fetchError.message);
        toast({
          title: 'Error',
          description: `Failed to find content to delete: ${fetchError.message}`,
          variant: 'destructive',
        });
        return false;
      }
      
      // Proceed with deletion
      const { error } = await supabase
        .from('website_content')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting website content:', error);
        setError(error.message);
        toast({
          title: 'Error',
          description: `Failed to delete website content: ${error.message}`,
          variant: 'destructive',
        });
        return false;
      }
      
      console.log('Successfully deleted website content');
      
      // Update local state
      setWebsiteContent(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: 'Success',
        description: 'Website content deleted successfully',
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Exception deleting website content:', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to delete website content: ${errorMessage}`,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fetch sitemap pages
  const fetchSitemapPages = async (websiteId: string, customSitemapUrl?: string): Promise<WebsiteContent[]> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching sitemap pages for website ID: ${websiteId}${customSitemapUrl ? ` with custom URL: ${customSitemapUrl}` : ''}`);
      
      // Special handling for WorkForceEU.com
      if (customSitemapUrl === undefined) {
        // Get the website URL to check if it's WorkForceEU.com
        const { data: website } = await supabase
          .from('websites')
          .select('url')
          .eq('id', websiteId)
          .single();
          
        if (website?.url?.includes('workforceeu.com')) {
          console.log('Detected WorkForceEU.com website - using known sitemap URL');
          customSitemapUrl = 'https://workforceeu.com/sitemap_index.xml';
        }
      }
      
      // Call the Supabase Edge Function to get sitemap pages
      const { data, error } = await supabase.functions.invoke('get-sitemap-pages', {
        body: { 
          website_id: websiteId,
          custom_sitemap_url: customSitemapUrl
        }
      });
      
      if (error) {
        console.error('Error fetching sitemap pages:', error);
        setError(error.message);
        toast({
          title: 'Error',
          description: `Failed to fetch sitemap pages: ${error.message}`,
          variant: 'destructive',
        });
        return [];
      }
      
      if (data.error) {
        console.error('Error from sitemap function:', data.error);
        setError(data.error);
        
        // Only show a toast if this was a custom URL attempt or not a "No sitemap found" error
        if (customSitemapUrl || data.error !== "No sitemap found") {
          toast({
            title: 'Error',
            description: data.message || `Failed to fetch sitemap pages: ${data.error}`,
            variant: 'destructive',
          });
        }
        
        return [];
      }
      
      if (!data.pages || data.pages.length === 0) {
        console.log('No pages found in sitemap');
        
        // Only show a toast if this was a custom URL attempt
        if (customSitemapUrl) {
          toast({
            title: 'No pages found',
            description: data.message || 'No pages were found in the sitemap.',
            variant: 'default',
          });
        }
        
        return [];
      }
      
      console.log(`Retrieved ${data.pages.length} sitemap pages from sitemap at ${data.sitemap_url}`);
      
      // Show warning if we hit the page limit
      if (data.warning) {
        console.log('Warning from sitemap function:', data.warning);
        toast({
          title: 'Page Limit Reached',
          description: data.warning,
          variant: 'default',
        });
      }
      
      // Convert the returned data to WebsiteContent format
      const sitemapPages: WebsiteContent[] = data.pages.map((page: any) => ({
        id: page.id,
        website_id: page.website_id,
        url: page.url,
        title: page.title,
        content: '', // Empty content initially
        content_type: page.content_type || 'page', // Use the content type from sitemap
        last_fetched: page.last_fetched,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: { sitemap_url: data.sitemap_url },
        is_cornerstone: false // Default to not cornerstone
      }));
      
      return sitemapPages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Exception fetching sitemap pages:', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to fetch sitemap pages: ${errorMessage}`,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Import sitemap pages into the database
  const importSitemapPages = async (websiteId: string, customSitemapUrl?: string): Promise<number> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Importing sitemap pages for website ID: ${websiteId}`);
      
      // Fetch the sitemap pages
      const pages = await fetchSitemapPages(websiteId, customSitemapUrl);
      
      if (pages.length === 0) {
        console.log('No sitemap pages found to import');
        return 0;
      }
      
      console.log(`Found ${pages.length} sitemap pages to import`);
      
      // Prepare the pages for insertion
      const pagesToInsert = pages.map(page => ({
        website_id: websiteId,
        url: page.url,
        title: page.title || page.url,
        content: page.content || '',
        content_type: page.content_type || 'page', // Use the content type from sitemap
        last_fetched: new Date().toISOString(),
        metadata: {},
        is_cornerstone: false // Default to not cornerstone
      }));
      
      // Insert the pages in batches to avoid hitting size limits
      const batchSize = 50;
      let insertedCount = 0;
      
      for (let i = 0; i < pagesToInsert.length; i += batchSize) {
        const batch = pagesToInsert.slice(i, i + batchSize);
        
        try {
          // First check if any of these pages already exist
          const urls = batch.map(page => page.url);
          const { data: existingPages } = await supabase
            .from('website_content')
            .select('url')
            .eq('website_id', websiteId)
            .in('url', urls);
          
          // Filter out pages that already exist
          const existingUrls = new Set((existingPages || []).map((p: any) => p.url));
          console.log(`Found ${existingUrls.size} existing pages, skipping these`);
          
          const newPages = batch.filter(page => !existingUrls.has(page.url));
          
          if (newPages.length > 0) {
            // Insert new pages
            const { error } = await supabase
              .from('website_content')
              .insert(newPages);
            
            if (error) {
              console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
              setError(error.message);
              toast({
                title: 'Error',
                description: `Failed to import sitemap pages: ${error.message}`,
                variant: 'destructive',
              });
            } else {
              insertedCount += newPages.length;
              console.log(`Inserted batch ${i / batchSize + 1} (${newPages.length} pages)`);
            }
          }
        } catch (error) {
          console.error(`Error processing batch ${i / batchSize + 1}:`, error);
        }
      }
      
      console.log(`Successfully imported ${insertedCount} sitemap pages`);
      
      // Refresh the website content
      await fetchWebsiteContent(websiteId);
      
      toast({
        title: 'Success',
        description: `Imported ${insertedCount} sitemap pages`,
      });
      
      return insertedCount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Exception importing sitemap pages:', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to import sitemap pages: ${errorMessage}`,
        variant: 'destructive',
      });
      return 0;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Determines the content type based on URL patterns
   */
  const determineContentType = (url: string): string => {
    const urlLower = url.toLowerCase();
    
    // Check for post patterns
    if (urlLower.includes('/post/') || 
        urlLower.includes('/blog/') || 
        urlLower.includes('/article/') ||
        urlLower.includes('/news/')) {
      return 'post';
    }
    
    // Check for category patterns
    if (urlLower.includes('/category/')) {
      return 'category';
    }
    
    // Check for post category patterns
    if (urlLower.includes('/post-category/') || 
        urlLower.includes('/blog-category/')) {
      return 'post_category';
    }
    
    // Check for product patterns
    if (urlLower.includes('/product/') || 
        urlLower.includes('/shop/') || 
        urlLower.includes('/store/')) {
      return 'product';
    }
    
    // Check for product category patterns
    if (urlLower.includes('/product-category/') || 
        urlLower.includes('/shop-category/') || 
        urlLower.includes('/store-category/')) {
      return 'product_category';
    }
    
    // Default to page
    return 'page';
  };

  // Crawl website pages when no sitemap is available
  const crawlWebsitePages = async (websiteId: string, maxPages = 50): Promise<WebsiteContent[]> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Crawling pages for website ID: ${websiteId}, max pages: ${maxPages}`);
      
      // Call the Supabase Edge Function to crawl website pages
      const { data, error } = await supabase.functions.invoke('crawl-website-pages', {
        body: { 
          website_id: websiteId,
          max_pages: maxPages
        }
      });
      
      if (error) {
        console.error('Error crawling website pages:', error);
        setError(error.message);
        toast({
          title: 'Error',
          description: `Failed to crawl website pages: ${error.message}`,
          variant: 'destructive',
        });
        return [];
      }
      
      if (data.error) {
        console.error('Error from crawl function:', data.error);
        setError(data.error);
        toast({
          title: 'Error',
          description: data.message || `Failed to crawl website pages: ${data.error}`,
          variant: 'destructive',
        });
        return [];
      }
      
      if (!data.pages || data.pages.length === 0) {
        console.log('No pages found during crawl');
        toast({
          title: 'No pages found',
          description: data.message || 'No pages were found during the website crawl.',
          variant: 'default',
        });
        return [];
      }
      
      console.log(`Retrieved ${data.pages.length} pages from crawling ${data.crawl_url}`);
      
      // Convert the returned data to WebsiteContent format
      const crawledPages: WebsiteContent[] = data.pages.map((page: any) => ({
        id: page.id,
        website_id: page.website_id,
        url: page.url,
        title: page.title,
        content: '', // Empty content initially
        content_type: determineContentType(page.url), // Use URL pattern analysis
        last_fetched: page.last_fetched,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: { crawl_url: data.crawl_url },
        is_cornerstone: false // Default to not cornerstone
      }));
      
      return crawledPages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Exception crawling website pages:', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to crawl website pages: ${errorMessage}`,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Import crawled pages into the database
  const importCrawledPages = async (websiteId: string, maxPages?: number): Promise<number> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Importing crawled pages for website ID: ${websiteId}`);
      
      // Fetch the crawled pages
      const pages = await crawlWebsitePages(websiteId, maxPages);
      
      if (pages.length === 0) {
        console.log('No crawled pages found to import');
        return 0;
      }
      
      console.log(`Found ${pages.length} crawled pages to import`);
      
      // Prepare the pages for insertion
      const pagesToInsert = pages.map(page => ({
        website_id: websiteId,
        url: page.url,
        title: page.title || page.url,
        content: page.content || '',
        content_type: determineContentType(page.url), // Use URL pattern analysis
        last_fetched: new Date().toISOString(),
        metadata: {},
        is_cornerstone: false // Default to not cornerstone
      }));
      
      // Insert the pages in batches to avoid hitting size limits
      const batchSize = 50;
      let insertedCount = 0;
      
      for (let i = 0; i < pagesToInsert.length; i += batchSize) {
        const batch = pagesToInsert.slice(i, i + batchSize);
        
        try {
          // First check if any of these pages already exist
          const urls = batch.map(page => page.url);
          const { data: existingPages } = await supabase
            .from('website_content')
            .select('url')
            .eq('website_id', websiteId)
            .in('url', urls);
          
          // Filter out pages that already exist
          const existingUrls = new Set((existingPages || []).map((p: any) => p.url));
          console.log(`Found ${existingUrls.size} existing pages, skipping these`);
          
          const newPages = batch.filter(page => !existingUrls.has(page.url));
          
          if (newPages.length > 0) {
            // Insert new pages
            const { error } = await supabase
              .from('website_content')
              .insert(newPages);
            
            if (error) {
              console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
              setError(error.message);
              toast({
                title: 'Error',
                description: `Failed to import crawled pages: ${error.message}`,
                variant: 'destructive',
              });
            } else {
              insertedCount += newPages.length;
              console.log(`Inserted batch ${i / batchSize + 1} (${newPages.length} pages)`);
            }
          }
        } catch (error) {
          console.error(`Error processing batch ${i / batchSize + 1}:`, error);
        }
      }
      
      console.log(`Successfully imported ${insertedCount} crawled pages`);
      
      // Refresh the website content
      await fetchWebsiteContent(websiteId);
      
      toast({
        title: 'Success',
        description: `Imported ${insertedCount} crawled pages`,
      });
      
      return insertedCount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Exception importing crawled pages:', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to import crawled pages: ${errorMessage}`,
        variant: 'destructive',
      });
      return 0;
    } finally {
      setLoading(false);
    }
  };

  // Set a piece of content as cornerstone
  const setCornerstone = async (contentId: string | null, websiteId: string): Promise<boolean> => {
    console.log('setCornerstone called with contentId:', contentId, 'websiteId:', websiteId);
    
    try {
      // Don't set loading state to avoid causing re-renders in components
      // setLoading(true);
      setError(null);
      
      // If contentId is null, we're unsetting cornerstone status
      if (contentId === null) {
        console.log(`No content will be set as cornerstone`);
        return true;
      }
      
      // Get the current content to check its cornerstone status
      const { data: currentContent, error: fetchError } = await supabase
        .from('website_content')
        .select('is_cornerstone')
        .eq('id', contentId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching content status:', fetchError);
        setError(fetchError.message);
        return false;
      }
      
      // Determine if we're setting or unsetting cornerstone status
      const currentIsCornerstone = (currentContent as any).is_cornerstone === true;
      const newIsCornerstone = !currentIsCornerstone;
      
      console.log(`${newIsCornerstone ? 'Setting' : 'Unsetting'} content ID: ${contentId} as cornerstone for website ID: ${websiteId}`);
      
      // Update the content's cornerstone status
      const { error: updateError } = await supabase
        .from('website_content')
        .update({ is_cornerstone: newIsCornerstone, updated_at: new Date().toISOString() })
        .eq('id', contentId);
      
      if (updateError) {
        console.error('Error updating cornerstone content:', updateError);
        setError(updateError.message);
        toast({
          title: 'Error',
          description: `Failed to update cornerstone content: ${updateError.message}`,
          variant: 'destructive',
        });
        return false;
      }
      
      console.log('Database update successful');
      
      // We don't need to update the global state here since the component is managing its own state
      // This prevents unnecessary re-renders of the entire content list
      
      toast({
        title: 'Success',
        description: `Cornerstone content ${newIsCornerstone ? 'set' : 'unset'} successfully`,
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Exception updating cornerstone content:', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to update cornerstone content: ${errorMessage}`,
        variant: 'destructive',
      });
      return false;
    } finally {
      // Don't set loading state to avoid causing re-renders in components
      // setLoading(false);
    }
  };

  // Fix cornerstone content database issues
  const fixCornerstoneContent = async (): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Running cornerstone content fix...');
      
      // Update any NULL values to FALSE for consistency
      const { error: updateError } = await supabase
        .from('website_content')
        .update({ is_cornerstone: false })
        .is('is_cornerstone', null);
      
      if (updateError) {
        console.error('Error updating NULL values:', updateError);
        setError(updateError.message);
        toast({
          title: 'Error',
          description: `Failed to update NULL values: ${updateError.message}`,
          variant: 'destructive',
        });
        return `Error: ${updateError.message}`;
      }
      
      // Count cornerstone content by website
      const { data: countData, error: countError } = await supabase
        .from('website_content')
        .select('website_id')
        .eq('is_cornerstone', true)
        .order('website_id');
      
      if (countError) {
        console.error('Error counting cornerstone content:', countError);
      } else {
        // Group by website_id and count
        const counts = countData.reduce((acc, item) => {
          acc[item.website_id] = (acc[item.website_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('Current cornerstone content counts by website:', counts);
      }
      
      // Don't automatically refresh all website content - let the component handle this if needed
      // for (const website of websites) {
      //   await fetchWebsiteContent(website.id);
      // }
      
      toast({
        title: 'Success',
        description: 'Cornerstone content database check completed successfully',
      });
      
      return 'Database check completed. Any NULL values in is_cornerstone have been set to FALSE.';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Exception fixing cornerstone content:', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to check cornerstone content: ${errorMessage}`,
        variant: 'destructive',
      });
      return `Error: ${errorMessage}`;
    } finally {
      setLoading(false);
    }
  };

  // Import pages from sitemap or crawl
  const importPages = async (websiteId: string, options: { 
    maxPages?: number, 
    customSitemapUrl?: string,
    useSitemap?: boolean 
  }): Promise<number> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Importing pages for website ID: ${websiteId}`, options);
      
      // Try sitemap first if not explicitly disabled
      let pages: { url: string; title?: string; content?: string; content_type?: string }[] = [];
      
      if (options.useSitemap !== false) {
        pages = await fetchSitemapPages(websiteId, options.customSitemapUrl);
        console.log(`Found ${pages.length} sitemap pages`);
      }
      
      // If no pages found from sitemap and maxPages is set, try crawling
      if (pages.length === 0 && options.maxPages) {
        pages = await crawlWebsitePages(websiteId, options.maxPages);
        console.log(`Found ${pages.length} crawled pages`);
      }
      
      if (pages.length === 0) {
        console.log('No pages found to import');
        return 0;
      }
      
      // Prepare the pages for insertion
      const pagesToInsert = pages.map(page => ({
        website_id: websiteId,
        url: page.url,
        title: page.title || page.url,
        content: page.content || '',
        content_type: page.content_type || 'page', // Use the content type from the source, default to 'page'
        last_fetched: new Date().toISOString(),
        metadata: {},
        is_cornerstone: false // Default to not cornerstone
      }));
      
      // Insert the pages in batches to avoid hitting size limits
      const batchSize = 50;
      let insertedCount = 0;
      
      for (let i = 0; i < pagesToInsert.length; i += batchSize) {
        const batch = pagesToInsert.slice(i, i + batchSize);
        
        try {
          // First check if any of these pages already exist
          const urls = batch.map(page => page.url);
          const { data: existingPages } = await supabase
            .from('website_content')
            .select('url')
            .eq('website_id', websiteId)
            .in('url', urls);
          
          // Filter out pages that already exist
          const existingUrls = new Set((existingPages || []).map((p: any) => p.url));
          console.log(`Found ${existingUrls.size} existing pages, skipping these`);
          
          const newPages = batch.filter(page => !existingUrls.has(page.url));
          
          if (newPages.length > 0) {
            // Insert new pages
            const { error } = await supabase
              .from('website_content')
              .insert(newPages);
            
            if (error) {
              console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
              setError(error.message);
              toast({
                title: 'Error',
                description: `Failed to import pages: ${error.message}`,
                variant: 'destructive',
              });
            } else {
              insertedCount += newPages.length;
              console.log(`Inserted batch ${i / batchSize + 1} (${newPages.length} pages)`);
            }
          }
        } catch (error) {
          console.error(`Error processing batch ${i / batchSize + 1}:`, error);
        }
      }
      
      console.log(`Successfully imported ${insertedCount} pages`);
      
      // Refresh the website content after importing
      if (insertedCount > 0) {
        console.log(`Refreshing website content after importing ${insertedCount} pages`);
        await fetchWebsiteContent(websiteId);
      }
      
      toast({
        title: 'Success',
        description: `Successfully imported ${insertedCount} pages`,
      });
      
      return insertedCount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Exception importing pages:', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to import pages: ${errorMessage}`,
        variant: 'destructive',
      });
      return 0;
    } finally {
      setLoading(false);
    }
  };

  // Scrape content from cornerstone pages
  const scrapeCornerstone = async (websiteId: string): Promise<number> => {
    try {
      setLoading(true);
      setError(null);

      // Call the Supabase Edge Function to scrape content
      const { data, error } = await supabase.functions.invoke('scrape-content', {
        body: { website_id: websiteId }
      });

      if (error) {
        console.error('Error scraping content:', error);
        toast({
          title: 'Error',
          description: 'Failed to analyze key content',
          variant: 'destructive'
        });
        return 0;
      }

      if (!data.processed) {
        toast({
          title: 'No Content',
          description: data.message || 'No key content pages found to analyze'
        });
        return 0;
      }

      // Refresh the website content to get the updated content
      await fetchWebsiteContent(websiteId);

      // Show success message
      toast({
        title: 'Success',
        description: data.message,
        variant: data.processed === data.total ? 'default' : 'destructive'
      });

      return data.processed;
    } catch (error) {
      console.error('Error in scrapeCornerstone:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze key content',
        variant: 'destructive'
      });
      return 0;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formats plain text content by adding paragraph tags and preserving line breaks
   */
  const formatPlainText = (text: string): string => {
    return text
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 0)
      .map(p => `<p>${p.trim().replace(/\n/g, '<br />')}</p>`)
      .join('\n');
  };

  /**
   * Cleans and structures HTML content to ensure proper formatting
   */
  const cleanAndStructureContent = (element: Element): string => {
    // Get the HTML content
    let html = element.innerHTML || '';
    
    // Remove excessive whitespace
    html = html.replace(/\s+/g, ' ');
    
    // Replace consecutive <br> tags with paragraph breaks
    html = html.replace(/(<br\s*\/?>\s*){2,}/gi, '</p><p>');
    
    // Wrap plain text nodes in paragraphs
    const tempDoc = document.createElement('div');
    tempDoc.innerHTML = html;
    
    // Process text nodes
    const processNode = (node: Node) => {
      if (node.nodeType === 3 && node.textContent?.trim()) { // Text node
        const parent = node.parentElement;
        if (parent && parent.tagName !== 'P' && parent.tagName !== 'DIV' && 
            parent.tagName !== 'H1' && parent.tagName !== 'H2' && 
            parent.tagName !== 'H3' && parent.tagName !== 'H4' && 
            parent.tagName !== 'H5' && parent.tagName !== 'H6' && 
            parent.tagName !== 'LI' && parent.tagName !== 'TD' &&
            parent.tagName !== 'SPAN' && parent.tagName !== 'A' &&
            parent.tagName !== 'STRONG' && parent.tagName !== 'EM' &&
            parent.tagName !== 'B' && parent.tagName !== 'I') {
          
          // Create a paragraph element
          const p = document.createElement('p');
          // Replace the text node with the paragraph
          parent.replaceChild(p, node);
          // Add the text to the paragraph
          p.appendChild(node);
        }
      }
      
      // Process child nodes
      const childNodes = Array.from(node.childNodes);
      childNodes.forEach(child => {
        if (child.nodeType === 1 || child.nodeType === 3) { // Element or text node
          processNode(child);
        }
      });
    };
    
    processNode(tempDoc);
    
    // Get the processed HTML
    html = tempDoc.innerHTML;
    
    // Ensure paragraphs have proper spacing
    html = html.replace(/<\/p>\s*<p>/g, '</p>\n<p>');
    
    // Ensure headings have proper spacing
    html = html.replace(/<\/h([1-6])>\s*<([^>]+)>/g, '</h$1>\n<$2>');
    
    // Ensure lists have proper spacing
    html = html.replace(/<\/(ul|ol)>\s*<([^>]+)>/g, '</$1>\n<$2>');
    
    // If the content still doesn't have proper HTML formatting, add it
    if (!html.includes('<p>') && !html.includes('<div>')) {
      html = formatPlainText(html);
    }
    
    return html;
  };

  /**
   * Extracts the main content from an HTML string
   * This is a basic implementation that should be enhanced based on specific needs
   */
  const extractMainContent = (html: string): string => {
    try {
      // Create a DOM parser
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Remove unwanted elements
      const elementsToRemove = [
        'script',
        'style',
        'iframe',
        'noscript',
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
        '#header',
        '.header',
        '.footer',
        '.navigation',
        '.menu',
        '.cart',
        '.shopping-cart',
        '.search',
        '.social',
        '.cookie',
        '.popup',
        '.modal',
        '.banner',
        '.ad',
        '.widget',
        // Additional elements to remove
        'button',
        '.product',
        '.products',
        '.woocommerce',
        '.price',
        '.add-to-cart',
        '.checkout',
        '.related-products',
        '.carousel',
        '.slider',
        '.gallery',
        '.slideshow',
        '.breadcrumb',
        '.breadcrumbs',
        '.pagination',
        '.share',
        '.sharing',
        '.rating',
        '.reviews',
        '.tags',
        '.categories',
        '.author',
        '.date',
        '.meta',
        '.newsletter',
        '.subscribe',
        '.cta',
        '.call-to-action'
      ];

      elementsToRemove.forEach(selector => {
        doc.querySelectorAll(selector).forEach(el => el.remove());
      });

      // Remove all images
      doc.querySelectorAll('img').forEach(el => el.remove());

      // Remove all iframes
      doc.querySelectorAll('iframe').forEach(el => el.remove());

      // Remove all SVGs
      doc.querySelectorAll('svg').forEach(el => el.remove());

      // Remove all buttons and links that look like buttons
      doc.querySelectorAll('a.button, .btn, button, input[type="button"], input[type="submit"]').forEach(el => el.remove());

      // Remove elements with common product-related classes
      const productClassPatterns = [
        /product/i, /price/i, /cart/i, /shop/i, /buy/i, /purchase/i, /offer/i, 
        /discount/i, /sale/i, /promo/i, /deal/i, /stock/i, /delivery/i, /shipping/i
      ];

      doc.querySelectorAll('*').forEach(el => {
        const classNames = el.className?.toString() || '';
        const id = el.id || '';
        
        // Check if any class or ID matches product patterns
        if (productClassPatterns.some(pattern => pattern.test(classNames) || pattern.test(id))) {
          el.remove();
        }
      });

      // Try to find the main content container
      const mainContent = 
        doc.querySelector('article') || 
        doc.querySelector('main') || 
        doc.querySelector('.content') || 
        doc.querySelector('.post-content') ||
        doc.querySelector('.entry-content') ||
        doc.querySelector('.page-content') ||
        doc.querySelector('#content') ||
        doc.querySelector('[role="main"]');

      // If we found a main content container, use it
      if (mainContent) {
        // Clean up the content before returning
        return cleanAndStructureContent(mainContent);
      }

      // If no main content container is found, try to extract content from the body
      // but first remove common non-content sections
      const body = doc.body;
      
      // Extract text content from paragraphs and headings
      const contentElements = Array.from(body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote'));
      
      // Filter out elements that are likely not part of the main content
      const filteredElements = contentElements.filter(el => {
        // Skip empty elements
        if (!el.textContent?.trim()) return false;
        
        // Skip very short paragraphs that are likely not main content
        if (el.tagName === 'P' && el.textContent.trim().length < 20) {
          // Check if it's part of a larger content block
          const parent = el.parentElement;
          if (parent && parent.querySelectorAll('p').length <= 1) {
            return false;
          }
        }
        
        // Skip elements with product-related text
        const text = el.textContent.toLowerCase();
        if (
          text.includes('add to cart') || 
          text.includes('buy now') || 
          text.includes('price') || 
          text.includes('checkout') ||
          text.includes('shipping') ||
          text.includes('delivery') ||
          text.includes('product') ||
          text.includes('shop now')
        ) {
          return false;
        }
        
        return true;
      });
      
      if (filteredElements.length > 0) {
        // Create a new div to hold our extracted content
        const extractedContent = document.createElement('div');
        
        // Add each element to our container
        filteredElements.forEach(el => {
          extractedContent.appendChild(el.cloneNode(true));
        });
        
        return cleanAndStructureContent(extractedContent);
      }
      
      // Last resort: just clean up the body content
      return cleanAndStructureContent(body);
    } catch (error) {
      console.error('Error extracting content:', error);
      return '';
    }
  };

  // Create the context value
  const contextValue: WebsiteContentContextType = {
    websiteContent,
    loading,
    error,
    fetchWebsiteContent,
    addWebsiteContent,
    updateWebsiteContent,
    deleteWebsiteContent,
    fetchSitemapPages,
    importSitemapPages,
    crawlWebsitePages,
    importCrawledPages,
    setCornerstone,
    fixCornerstoneContent,
    importPages,
    scrapeCornerstone
  };

  return (
    <WebsiteContentContext.Provider value={contextValue}>
      {children}
    </WebsiteContentContext.Provider>
  );
};

// Create a hook to use the context
export const useWebsiteContent = () => {
  const context = useContext(WebsiteContentContext);
  if (context === undefined) {
    throw new Error('useWebsiteContent must be used within a WebsiteContentProvider');
  }
  return context;
}; 