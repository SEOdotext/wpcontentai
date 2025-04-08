import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowRight, 
  FileText, 
  BookOpen, 
  Layout, 
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Wand2,
  ThumbsUp,
  ThumbsDown,
  X,
  Code,
  Eye,
  Key,
  Link,
  HelpCircle,
  Loader2,
  Users,
  UserPlus,
  Trash2,
  Shield,
  Globe
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from 'react-helmet-async';
import { Separator } from '@/components/ui/separator';
import { toast as sonnerToast } from 'sonner';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useOrganisation } from '@/context/OrganisationContext';
import { useWebsites } from '@/context/WebsitesContext';
import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Types
interface ContentType {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
  recommended?: string;
}

interface ContentStep {
  id: number;
  name: string;
  description: string;
  detail: string;
  duration: number;
  substeps?: string[];
}

interface OnboardingState {
  step: number;
  websiteUrl: string;
  progress: number;
  currentStepIndex: number;
  currentStepText: string;
  selectedType: string | null;
  contentGenerated: boolean;
  generatedContentTitle: string;
  generatedContentPreview: string;
  showRawContent: boolean;
  showWpAuthDialog: boolean;
  wpUsername: string;
  wpPassword: string;
  isAuthenticating: boolean;
  wpConnectionError: string | null;
}

interface Step {
  id: number;
  name: string;
  description: string;
}

const contentTypes: ContentType[] = [
  {
    id: 'blog',
    name: 'Blog Posts',
    description: 'Regular informative articles to educate your audience and boost SEO.',
    icon: <FileText className="w-5 h-5 text-primary" />,
    recommended: "Recommended for SEO 🔍"
  },
  {
    id: 'guide',
    name: 'How-to Guides',
    description: 'Step-by-step instructions in your helpful, clear format.',
    icon: <BookOpen className="w-5 h-5 text-primary" />,
    recommended: "Great for User Experience 🎯"
  },
  {
    id: 'landing',
    name: 'Landing pages',
    description: 'Convert visitors with compelling value propositions.',
    icon: <Layout className="w-5 h-5 text-primary" />,
    recommended: "Best for Conversions 💎"
  }
];

const contentSteps: ContentStep[] = [
  { 
    id: 1, 
    name: "Account setup", 
    description: "Creating your workspace",
    detail: "Setting up your personal account and workspace",
    duration: 1000,
    substeps: [
      "Creating workspace",
      "Setting up account"
    ]
  },
  { 
    id: 2, 
    name: "Reading website", 
    description: "Analyzing your website",
    detail: "Extracting and analyzing your website content",
    duration: 3000,
    substeps: [
      "Fetching sitemap",
      "Reading pages",
      "Analyzing content"
    ]
  },
  { 
    id: 3, 
    name: "Language detection", 
    description: "Identifying website language",
    detail: "Detecting the primary language of your content",
    duration: 1500,
    substeps: [
      "Analyzing HTML",
      "Processing text",
      "Identifying language"
    ]
  },
  { 
    id: 4, 
    name: "Learning tone of voice", 
    description: "Understanding your style",
    detail: "Learning how you sound to match your voice",
    duration: 2500,
    substeps: [
      "Identifying key pages",
      "Analyzing writing style",
      "Capturing brand voice"
    ]
  },
  { 
    id: 5, 
    name: "Reading key content", 
    description: "Analyzing important pages",
    detail: "Reading your most important content in depth",
    duration: 2000,
    substeps: [
      "Extracting content",
      "Processing structure",
      "Identifying themes"
    ]
  },
  { 
    id: 6, 
    name: "Suggesting content ideas", 
    description: "Creating content ideas",
    detail: "Generating content ideas based on your site",
    duration: 2500,
    substeps: [
      "Analyzing opportunities",
      "Generating topics",
      "Matching to audience"
    ]
  }
];

// Animation logo for the progress steps
const LogoAnimation = () => (
  <motion.svg 
    width="48"
    height="48"
    viewBox="0 0 40 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <motion.path
      d="M8 20C8 13.3726 13.3726 8 20 8C26.6274 8 32 13.3726 32 20C32 26.6274 26.6274 32 20 32C16.6863 32 14 29.3137 14 26C14 22.6863 16.6863 20 20 20"
      stroke="url(#gradient1)"
      strokeWidth="3"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ 
        pathLength: { duration: 1.2, ease: "easeOut", delay: 0.2 },
        opacity: { duration: 0.01 }
      }}
    />
    <defs>
      <linearGradient id="gradient1" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" />
        <stop offset="0.5" stopColor="#C084FC" />
        <stop offset="1" stopColor="#F472B6" />
      </linearGradient>
    </defs>
  </motion.svg>
);

const steps: Step[] = [
  { 
    id: 1, 
    name: "Account setup", 
    description: "Creating your workspace"
  },
  { 
    id: 2, 
    name: "Reading website", 
    description: "Analyzing your website"
  },
  { 
    id: 3, 
    name: "Language detection", 
    description: "Identifying website language"
  },
  { 
    id: 4, 
    name: "Learning tone-of-voice", 
    description: "Understanding your style"
  },
  { 
    id: 5, 
    name: "Reading key content", 
    description: "Analyzing important pages"
  },
  { 
    id: 6, 
    name: "Suggesting content ideas", 
    description: "Creating content ideas"
  }
];

const Onboarding = () => {
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    websiteUrl: localStorage.getItem('onboardingWebsite') || 'https://example.com',
    progress: 0,
    currentStepIndex: 0,
    currentStepText: '',
    selectedType: null,
    contentGenerated: false,
    generatedContentTitle: '',
    generatedContentPreview: '',
    showRawContent: false,
    showWpAuthDialog: false,
    wpUsername: '',
    wpPassword: '',
    isAuthenticating: false,
    wpConnectionError: null
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Track liked ideas
  const [likedIdeas, setLikedIdeas] = useState<string[]>([]);
  
  // Track expanded states for each step
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  
  // Store step texts for completed steps
  const [stepTexts, setStepTexts] = useState<Record<number, string>>({});
  
  // Add a ref to track if setup has started
  const setupStarted = React.useRef(false);

  // Toggle expanded state for a step
  const toggleStepExpanded = (stepId: number) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  // Handle URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    
    if (urlParam) {
      let formattedUrl = urlParam;
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      
      // Store the URL and update state
      localStorage.setItem('onboardingWebsite', formattedUrl);
      setState(prev => ({ ...prev, websiteUrl: formattedUrl }));
    }
  }, []); // Only run once on mount

  // Handle initial setup
  useEffect(() => {
    // Only start setup if we're on step 1 and haven't started yet
    if (state.step === 1 && !setupStarted.current) {
      console.log("Starting onboarding process for website:", state.websiteUrl);
      setupStarted.current = true;
      startSetup1();
    }
  }, [state.step]); // Only depend on state.step

  // Helper function to call Supabase Edge Functions directly without authentication
  const callEdgeFunction = async (functionName: string, body: any) => {
    try {
      // Log the function name and parameters for debugging
      console.log(`Calling edge function: ${functionName}`, body);
      
      // Create headers with specific handling for generate-content-v3
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Add anon key for all function calls during onboarding
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      
      // Use a direct fetch to the Supabase Edge Function
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      console.log(`Response status for ${functionName}:`, resp.status);
      
      if (!resp.ok) {
        const errorText = await resp.text().catch(() => 'Unknown error');
        console.error(`Error response from ${functionName}:`, errorText);
        throw new Error(`Function ${functionName} returned status ${resp.status}: ${errorText}`);
      }
      
      const data = await resp.json();
      console.log(`Response from ${functionName}:`, data);
      return data;
    } catch (err) {
      console.error(`Failed to call ${functionName}:`, err);
      throw err;
    }
  };

  const startSetup1 = async () => {
    console.log("Starting Setup 1...");
    
    // Reset state
    setState(prevState => ({ 
      ...prevState, 
      progress: 0,
      currentStepIndex: 0,
      currentStepText: "Setting up your workspace..."
    }));
    
    // Reset step texts
    setStepTexts({});
    
    // Create website and organization IDs with uuid
    const websiteId = localStorage.getItem('website_id') || uuidv4();
    const organizationId = localStorage.getItem('organization_id') || uuidv4();
    
    // Store IDs in localStorage
    localStorage.setItem('website_id', websiteId);
    localStorage.setItem('organization_id', organizationId);
    
    // Create organization name from URL
    const urlWithoutProtocol = state.websiteUrl.replace(/^https?:\/\//, '');
    const domainParts = urlWithoutProtocol.split('.');
    const organizationName = domainParts.length > 1 ? domainParts[domainParts.length - 2] : urlWithoutProtocol;
    
    // Store website info
    const websiteInfo = {
      id: websiteId,
      url: state.websiteUrl,
      name: organizationName,
      organization_id: organizationId,
      created_at: new Date().toISOString()
    };
    localStorage.setItem('website_info', JSON.stringify(websiteInfo));
    
    // Store organization info
    const organizationInfo = {
      id: organizationId,
      name: organizationName.charAt(0).toUpperCase() + organizationName.slice(1),
      created_at: new Date().toISOString()
    };
    localStorage.setItem('organization_info', JSON.stringify(organizationInfo));
    
    // Setup 1 steps - these will all run without authentication
    const setup1Steps = [
      // Step 1: Account Setup
      async () => {
        setState(prev => ({ ...prev, currentStepIndex: 0, currentStepText: "Creating workspace..." }));
        await new Promise(r => setTimeout(r, 1000));
        return "No account? No problem! We made a quick site and organisation for you.\n\n✅ You're now set up with a private workspace based on your website url: " + state.websiteUrl + ". Everything is local, just for you.";
      },
      
      // Step 2: Reading Website
      async () => {
        setState(prev => ({ ...prev, currentStepIndex: 1, currentStepText: "Reading website..." }));
        try {
          // Try get-sitemap-pages function
          console.log("Attempting to call get-sitemap-pages with website_id:", websiteId);
          
          // Try with snake_case parameters
          const payload = { 
            website_id: websiteId, 
            website_url: state.websiteUrl,
            custom_sitemap_url: null 
          };
          
          let result = null;
          
            try {
              console.log("Trying get-sitemap-pages with payload:", payload);
              result = await callEdgeFunction('get-sitemap-pages', payload);
            } catch (error) {
              console.error("Failed with payload:", payload, error);
            throw error; // Let the error propagate up
          }
          
          if (result?.pages && result.pages.length > 0) {
            const limitedPages = result.pages.slice(0, 200);
            console.log(`Successfully loaded ${limitedPages.length} pages from sitemap`);
            console.log("Sample sitemap page structure:", limitedPages[0]);
            console.log("Page URLs sample:", limitedPages.slice(0, 5).map(p => p.url));
            
            // Store pages in localStorage for later use
            localStorage.setItem('website_content', JSON.stringify(limitedPages));
            
            // Make sure other functions can access this data
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return `We've just read your website — exciting! 😄 We can always do some more reading later.\n\n🧠 ${limitedPages.length} pages have been loaded from your sitemap.`;
          } else {
            // If no pages from sitemap, try crawling
            try {
              // Try crawl-website-pages function with snake_case
                  console.log("Trying crawl-website-pages with payload:", payload);
                  const crawlResult = await callEdgeFunction('crawl-website-pages', payload);
              
                  if (crawlResult?.pages && crawlResult.pages.length > 0) {
                    const limitedPages = crawlResult.pages.slice(0, 200);
                console.log(`Successfully loaded ${limitedPages.length} pages by crawling website`);
                
                // Store pages in localStorage for later use
                    localStorage.setItem('website_content', JSON.stringify(limitedPages));
                
                // Make sure other functions can access this data
                await new Promise(resolve => setTimeout(resolve, 500));
                
                    return `We've just read your website — exciting! 😄 We can always do some more reading later.\n\n🧠 ${limitedPages.length} pages have been loaded by scanning your website.`;
                  }
                } catch (error) {
                  console.error("Failed crawl with payload:", payload, error);
              throw error; // Let the error propagate up
              }
              
              // If we got here, all attempts failed
            throw new Error("Could not find any pages on the website. Please check the URL and try again.");
          }
        } catch (error) {
          console.error("Error reading website:", error);
          throw error; // Let the error propagate up
        }
      },
      
      // Step 3: Language Detection (hidden from user)
      async () => {
        setState(prev => ({ ...prev, currentStepIndex: 2, currentStepText: "Detecting language..." }));
        try {
          const result = await callEdgeFunction('detect-website-language', {
            website_id: websiteId,
            website_url: state.websiteUrl
          });
          
          if (result?.language) {
            // Store language in multiple locations for cross-compatibility
            const websiteInfo = JSON.parse(localStorage.getItem('website_info') || '{}');
            websiteInfo.language = result.language;
            localStorage.setItem('website_info', JSON.stringify(websiteInfo));
            
            // Also store directly as website_language for consistent access
            localStorage.setItem('website_language', result.language);
            
            console.log(`Language detected: ${result.language}`);
            
            // Log extra information for Danish sites
            if (result.language === 'da') {
              console.log("Danish language detected - will generate Danish content");
            }
          } else {
            // Set default language if detection fails
            setDefaultLanguage();
          }
          return ""; // No message shown to user
        } catch (error) {
          console.error("Error detecting language:", error);
          // Set default language if detection fails
          setDefaultLanguage();
          return "";
        }
      },
      
      // Step 4: Learning Tone-of-Voice
      async () => {
        setState(prev => ({ ...prev, currentStepIndex: 3, currentStepText: "Learning your tone..." }));
        try {
          // Get ALL sitemap pages stored in localStorage
          const rawWebsiteContent = JSON.parse(localStorage.getItem('website_content') || '[]');
          
          console.log(`Found ${rawWebsiteContent.length} raw sitemap pages in localStorage`);
          
          if (rawWebsiteContent.length > 0) {
            console.log("Raw sitemap page sample:", rawWebsiteContent[0]);
            console.log("First 5 page URLs:", rawWebsiteContent.slice(0, 5).map(p => p.url));
          }
          
          // Helper to extract title from URL
          const extractTitleFromUrl = (url: string): string => {
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
              lastSegment = lastSegment.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              
              return lastSegment || 'Page';
            } catch (error) {
              console.error(`Error extracting title from URL ${url}`, error);
              return 'Page';
            }
          };
          
          // Format ALL the sitemap pages to match the expected WebsiteContent structure
          const formattedWebsiteContent = rawWebsiteContent.map((page: any, index: number) => ({
            id: page.id || `page-${Date.now()}-${index}`,
            title: page.title || extractTitleFromUrl(page.url),
            url: page.url,
            content_type: page.content_type || 'page',
            is_cornerstone: false
          }));
          
          console.log(`Formatted ALL ${formattedWebsiteContent.length} sitemap pages for suggest-key-content`);
          
          if (formattedWebsiteContent.length === 0) {
            throw new Error("No pages found in website content. Please try a different website.");
          }
          
          // Send ALL pages to suggest-key-content so it has full context
          const payload = {
            website_id: websiteId,
            website_url: state.websiteUrl,
            sitemap_pages: formattedWebsiteContent,
            pages: formattedWebsiteContent,
            is_onboarding: true
          };
          
          console.log(`Sending ${formattedWebsiteContent.length} pages to suggest-key-content`);
          
          const result = await callEdgeFunction('suggest-key-content', payload);
          
          console.log("suggest-key-content result:", result);
          
          if (result?.suggestions && result.suggestions.length > 0) {
            console.log(`Received ${result.suggestions.length} key content suggestions`);
            
            // Improve logging to show clearer information about the suggested pages
            const samplePages = result.suggestions.slice(0, 5);
            console.log("Suggestions data sample:", samplePages.map(p => ({
              title: p.title,
              path: p.url ? new URL(p.url).pathname : '/',
              id: p.id
            })));
            
            const selectedPages = result.suggestions.slice(0, 5);
            localStorage.setItem('key_content_pages', JSON.stringify(selectedPages));
            
            // Extract just the path portion for display
            const pageUrls = selectedPages.map((page: any) => {
              try {
                // Try to parse the URL and get just the pathname
                const url = page.url ? new URL(page.url).pathname : '/';
                const displayUrl = url === '/' ? '/ (Homepage)' : url;
                return displayUrl;
              } catch (e) {
                // Fallback if URL parsing fails
                return page.url?.replace(state.websiteUrl, '') || '/';
              }
            }).join('\n');
            
            return `🗣️ Learning Tone-of-Voice\n\nWe're learning how you sound so we can write like you.\n🔍 Selected and prioritised these key pages to understand your tone and style:\n${pageUrls}\n(Don't worry, you can adjust this later.)`;
          } else {
            // Don't use mock data - show the actual error
            console.error("No suggestions returned from suggest-key-content:", result);
            throw new Error("Could not identify key content pages. Please try a different website.");
          }
        } catch (error) {
          console.error('Error learning tone:', error);
          
          // Don't mask errors with mock data - show the real issue
          sonnerToast("Error generating ideas", {
            description: error.message || "Failed to generate content ideas. Please try again."
          });
          throw error;
        }
      },
      
      // Step 5: Reading Key Content
      async () => {
        setState(prev => ({ ...prev, currentStepIndex: 4, currentStepText: "Reading key content..." }));
        try {
          const keyPages = JSON.parse(localStorage.getItem('key_content_pages') || '[]');
          let success = false;
          
          // Improved logging to show more useful information about key pages
          console.log(`Reading key content for ${keyPages.length} pages`);
          
          if (keyPages.length > 0) {
            // Log detailed key page information
            console.log("Key pages detailed data:", keyPages.map(page => ({
              id: page.id,
              title: page.title || 'Untitled',
              url: page.url || 'No URL',
              reason: page.reason?.substring(0, 50) + '...' // Truncate long reasons
            })));
            
            // Create an empty array to store the scraped content
            const scrapedContent = [];
            
            try {
              // Process each key page individually
              for (const page of keyPages) {
                // Make sure we're using the full URL from the page data, not constructing it from ID
                const pageUrl = page.url;
                
                if (!pageUrl) {
                  console.error(`No valid URL found for page:`, page);
                  continue;
                }
                
                console.log(`Scraping content for page: ${page.title || 'Untitled'} (${pageUrl})`);
                
                // Call scrape-content to actually get the content
                const scrapeResult = await callEdgeFunction('scrape-content', {
                  website_id: websiteId,
                  website_url: pageUrl
                });
                
                // Log the full scrape result for debugging
                console.log(`Full scrape result for ${pageUrl}:`, JSON.stringify(scrapeResult));
                
                // Log a summary of the scrape result rather than the full object
                if (scrapeResult?.pages && scrapeResult.pages.length > 0) {
                  console.log(`Scrape successful for ${pageUrl}: received ${scrapeResult.pages.length} pages with a total of approximately ${scrapeResult.pages.reduce((sum, p) => sum + (p.content?.length || 0), 0)} characters of content`);
                  
                  // Add the scraped content to our array with page association
                  scrapeResult.pages.forEach(scrapedPage => {
                    scrapedContent.push({
                      ...scrapedPage,
                      page_id: page.id,
                      original_url: pageUrl,
                      title: page.title || scrapedPage.title || 'Untitled Page'
                    });
                  });
                  
              success = true;
                } else {
                  console.error(`Scrape failed for ${pageUrl}:`, scrapeResult);
                  
                  // Create a placeholder content entry even if scraping failed
                  // This ensures we have at least some reference to the key page
                  scrapedContent.push({
                    id: `placeholder-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    page_id: page.id,
                    original_url: pageUrl,
                    title: page.title || 'Untitled Page',
                    content: '',
                    digest: `This is a key page from ${pageUrl} but content could not be scraped.`
                  });
                }
              }
              
              // Store the scraped content array in localStorage
              if (scrapedContent.length > 0) {
                localStorage.setItem('scraped_content', JSON.stringify(scrapedContent));
                console.log(`Stored ${scrapedContent.length} scraped content entries in localStorage with detailed info:`, 
                  scrapedContent.map(c => ({
                    page_id: c.page_id,
                    title: c.title,
                    content_length: c.content?.length || 0,
                    digest_length: c.digest?.length || 0
                  }))
                );
              } else {
                console.error("No scraped content was retrieved from any key pages");
              }
              
            } catch (scrapeError) {
              console.error("Error scraping content:", scrapeError);
              throw scrapeError; // Let the error propagate to show real issues
            }
          } else {
            console.error("No key pages found to analyze - check suggest-key-content response");
            throw new Error("No key pages found to analyze");
          }
          
          // Even if some pages failed, consider it a success if we have some content
          const scrapedContentAfter = JSON.parse(localStorage.getItem('scraped_content') || '[]');
          if (scrapedContentAfter.length > 0) {
            success = true;
            console.log(`Successfully stored ${scrapedContentAfter.length} scraped content entries`);
          }
          
          if (!success) {
            throw new Error("Failed to scrape content from any key pages");
          }
          
          return "📚 Reading Key Content\n\nWe're digging deeper into your key content to fully understand your voice and topics.\n\nYour most important pages are now being read — this helps us learn how to write like you.";
        } catch (error) {
          console.error("Error reading content:", error);
          // Don't mask errors with mock data - show the real issue
          throw error;
        }
      },
      
      // Step 6: Suggesting Content Ideas
      async () => {
        setState(prev => ({ ...prev, currentStepIndex: 5, currentStepText: "Generating ideas..." }));
        try {
          // Get the detected language
          const language = localStorage.getItem('website_language') || 'en';
          
          // Get key content pages to ensure we have actual content to work with
          const keyContentPages = JSON.parse(localStorage.getItem('key_content_pages') || '[]');
          
          // Get scraped content if available
          const scrapedContent = JSON.parse(localStorage.getItem('scraped_content') || '[]');
          
          console.log("Step 6 - Available context:", {
            language,
            keyContentPages: keyContentPages.length,
            scrapedContent: scrapedContent.length
          });
          
          console.log("Key content pages detail:", keyContentPages.map(page => ({
            id: page.id,
            title: page.title,
            url: page.url,
            reason: page.reason?.substring(0, 50) + '...' // Truncate long reasons
          })));
          
          if (scrapedContent.length > 0) {
            console.log("Scraped content sample:", scrapedContent.slice(0, 2).map(content => ({
              id: content.id,
              page_id: content.page_id,
              title: content.title,
              content_length: content.content?.length || 0,
              digest_length: content.digest?.length || 0
            })));
          } else {
            console.warn("No scraped content available! This might affect content idea generation.");
          }
          
          if (keyContentPages.length === 0) {
            console.error("No key content pages found before generating ideas - this is a critical error");
            throw new Error("Missing key content pages. Previous steps are incomplete.");
          }
          
          // Send key information to generate-post-ideas
          const payload = {
            website_id: websiteId,
            website_url: state.websiteUrl,
            language,
            key_content_pages: keyContentPages.map(page => page.id), // Just send the IDs
            digestsOnly: true, // Flag to indicate we want to use digests only
            scraped_content: scrapedContent.map(item => ({
              id: item.id,
              page_id: item.page_id,
              title: item.title,
              url: item.url || item.original_url,
              digest: item.digest || '', // Only send the digest, not the full content
              last_fetched: item.last_fetched
            })), // Include just the digests, not the full HTML content
            is_onboarding: true
          };
          
          console.log("Calling generate-post-ideas with full payload:", JSON.stringify(payload, null, 2));
          
          const result = await callEdgeFunction('generate-post-ideas', payload);
          
          console.log("Generate post ideas result:", result);
          
          if (result?.ideas && result.ideas.length > 0) {
            // Store the ideas in localStorage
            localStorage.setItem('post_ideas', JSON.stringify(result.ideas));
            return "💡 Suggesting Relevant Content Ideas\n\nYour content garden is blooming! 🌱\n\nWe've generated 5 unique content ideas based on your tone and themes.\n🧠 You'll now see them and get to pick your favorites.";
          } else if (result?.success && Array.isArray(result.titles)) {
            // Handle older API response format
            const formattedIdeas = result.titles.map((title, index) => ({
              id: `idea-${index + 1}`,
              title,
              description: `Generated content idea #${index + 1} for your website.`,
              tags: result.keywordsByTitle?.[title] || [],
              hidden: false
            }));
            
            localStorage.setItem('post_ideas', JSON.stringify(formattedIdeas));
            return "💡 Suggesting Relevant Content Ideas\n\nYour content garden is blooming! 🌱\n\nWe've generated unique content ideas based on your tone and themes.\n🧠 You'll now see them and get to pick your favorites.";
        } else {
            console.warn('No ideas returned from generate-post-ideas function');
            // Don't use mock data - show the actual error
            throw new Error("No content ideas could be generated. API returned empty result.");
          }
        } catch (error) {
          console.error('Error generating ideas:', error);
          
          // Don't mask errors with mock data - show the real issue
          sonnerToast("Error generating ideas", {
            description: error.message || "Failed to generate content ideas. Please try again."
          });
          throw error; // Let the error propagate to stop the process
        }
      }
    ];
    
    // Run all setup1 steps in sequence
    const totalSteps = setup1Steps.length;
    try {
    for (let i = 0; i < totalSteps; i++) {
      // Update progress
      setState(prev => ({
        ...prev,
        progress: (i / totalSteps) * 100
      }));
      
        try {
      // Run current step
      const message = await setup1Steps[i]();
      
      // Display message if any
      if (message) {
        setState(prev => ({ ...prev, currentStepText: message }));
        
        // Store the message for this step
        setStepTexts(prev => ({
          ...prev,
          [steps[i].id]: message
        }));
        
        await new Promise(r => setTimeout(r, 2000)); // Pause to show message
      }
          
          // After each step, verify that required data was saved to localStorage
          if (i === 1) { // After Reading Website step
            const websiteContent = JSON.parse(localStorage.getItem('website_content') || '[]');
            if (websiteContent.length === 0) {
              console.error("No website content saved after step 2 - critical error");
              throw new Error("Failed to load any website pages. Please check the URL or try a different website.");
            } else {
              console.log(`Successfully saved ${websiteContent.length} pages to localStorage after step 2`);
            }
          } else if (i === 3) { // After Learning Tone-of-Voice
            const keyContentPages = JSON.parse(localStorage.getItem('key_content_pages') || '[]');
            if (keyContentPages.length === 0) {
              console.error("No key content pages saved after step 4 - critical error");
              throw new Error("Failed to identify key pages. Please try again or try a different website.");
            } else {
              console.log(`Successfully identified ${keyContentPages.length} key pages after step 4`);
            }
          } else if (i === 5) { // After Suggesting Content Ideas
            const postIdeas = JSON.parse(localStorage.getItem('post_ideas') || '[]');
            if (postIdeas.length === 0) {
              console.error("No content ideas saved after step 6 - critical error");
              throw new Error("Failed to generate any content ideas. Please try again later.");
            } else {
              console.log(`Successfully generated ${postIdeas.length} content ideas after step 6`);
            }
          }
        } catch (stepError) {
          console.error(`Error in step ${i+1}:`, stepError);
          // Show toast for visibility
          sonnerToast("Error", {
            description: `Error in step ${i+1}: ${stepError.message}. Please refresh and try again.`
          });
          setState(prev => ({ 
            ...prev, 
            currentStepText: `Error in step ${i+1}: ${stepError.message}. Please refresh and try again.` 
          }));
          return; // Stop execution on error
        }
      }
      
      // Before completing, verify all required data is present
      const websiteContent = JSON.parse(localStorage.getItem('website_content') || '[]');
      const keyContentPages = JSON.parse(localStorage.getItem('key_content_pages') || '[]');
      const postIdeas = JSON.parse(localStorage.getItem('post_ideas') || '[]');
      
      if (websiteContent.length === 0 || keyContentPages.length === 0 || postIdeas.length === 0) {
        console.error("Missing critical data before completing onboarding", {
          websiteContentCount: websiteContent.length,
          keyContentCount: keyContentPages.length,
          postIdeasCount: postIdeas.length
        });
        
        sonnerToast("Error Completing Setup", {
          description: "Missing required data to complete the setup. Please refresh and try again."
        });
        
        setState(prev => ({ 
          ...prev, 
          currentStepText: `Error: Missing required data to complete setup. Please refresh and try again.` 
        }));
        return;
    }
    
    // Complete Setup 1
    setState(prev => ({
      ...prev,
      progress: 100,
      step: 2 // Move to Setup 2: Content Idea Selection
    }));
    } catch (error) {
      console.error("Error in setup process:", error);
      sonnerToast("Setup Error", {
        description: error.message || "An unexpected error occurred. Please refresh and try again."
      });
      setState(prev => ({ 
        ...prev, 
        currentStepText: `Onboarding error: ${error.message}. Please refresh and try again.` 
      }));
    }
  };

  // Set default language to English
  const setDefaultLanguage = () => {
    const websiteInfo = JSON.parse(localStorage.getItem('website_info') || '{}');
    websiteInfo.language = 'en';
    localStorage.setItem('website_info', JSON.stringify(websiteInfo));
    
    // Also store directly as website_language for consistent access
    localStorage.setItem('website_language', 'en');
    
    console.log("Using default language: en");
  };

  // Handle thumbs up on content idea
  const handleThumbsUp = (id: string) => {
    setLikedIdeas(prev => [...prev, id]);
    
    // Mark idea as liked and hide it
    const postIdeas = JSON.parse(localStorage.getItem('post_ideas') || '[]');
    const updatedIdeas = postIdeas.map((idea: any) => 
      idea.id === id ? { ...idea, liked: true, hidden: true } : idea
    );
    localStorage.setItem('post_ideas', JSON.stringify(updatedIdeas));
    
    // Force update
    setState(prev => ({ ...prev }));
    
    sonnerToast("Idea saved!", {
      description: "We'll use this to create content for you."
    });
  };

  // Handle thumbs down on content idea
  const handleThumbsDown = (id: string) => {
    setLikedIdeas(prev => prev.filter(ideaId => ideaId !== id));
    
    // Mark idea as disliked and hide it
    const postIdeas = JSON.parse(localStorage.getItem('post_ideas') || '[]');
    const updatedIdeas = postIdeas.map((idea: any) => 
      idea.id === id ? { ...idea, liked: false, hidden: true } : idea
    );
    localStorage.setItem('post_ideas', JSON.stringify(updatedIdeas));
    
    // Force update
    setState(prev => ({ ...prev }));
  };

  // Handle generate new ideas
  const handleGenerateNewIdeas = () => {
    sonnerToast("Generating new ideas...", {
      duration: 5000,
    });

    try {
      const website_id = localStorage.getItem('website_id');
      const language = localStorage.getItem('website_language') || 'en';
      
      console.log(`Generating post ideas for website ID: ${website_id}`);
      console.log(`Website language detected: ${language}`);
      
      // Get necessary data to generate post ideas
      const requestParams = {
        website_id,
        website_url: state.websiteUrl,
        language: language
      };
      
      console.log(`Calling generate-post-ideas with params:`, requestParams);
      
      // Call the edge function to generate post ideas
      callEdgeFunction('generate-post-ideas', requestParams)
      .then(result => {
          console.log(`Generate post ideas result:`, result);
          
          // Handle the ideas from the result
          if (result.ideas && Array.isArray(result.ideas)) {
            // Store the ideas in localStorage
          localStorage.setItem('post_ideas', JSON.stringify(result.ideas));
            
            // Update state with the new ideas
            setLikedIdeas(result.ideas.map((idea: any) => idea.id));
          setState(prev => ({ ...prev }));
          } 
          // Handle older API response format
          else if (result.titles && Array.isArray(result.titles)) {
            const mappedIdeas = result.titles.map((title, index) => {
              const keywords = result.keywordsByTitle?.[title] || result.keywords || [];
              
              return {
                id: `idea-${index + 1}`,
                title,
                description: `Generated blog post idea based on your website content.`,
                tags: keywords,
                hidden: false
              };
            });
            
            // Store the ideas in localStorage
            localStorage.setItem('post_ideas', JSON.stringify(mappedIdeas));
            
            // Update state with the new ideas
            setLikedIdeas(mappedIdeas.map((idea: any) => idea.id));
            setState(prev => ({ ...prev }));
          } 
          else {
            console.warn('No ideas returned from generate-post-ideas function');
            // Don't use mock data - show the actual error
            sonnerToast("Error generating ideas", {
              description: "No content ideas could be generated. Please try again or contact support."
          });
        }
      })
      .catch(error => {
          console.error('Error generating post ideas:', error);
          
          // Don't mask the error with mock data
          sonnerToast("Error generating ideas", {
            description: error.message || "Failed to generate content ideas. Please try again."
        });
      });
    } catch (error) {
      console.error('Error in handleGenerateNewIdeas:', error);
      
      // Don't mask errors with mock data - show the real issue
      sonnerToast("Error generating ideas", {
        description: error.message || "An unexpected error occurred. Please try again."
      });
    }
  };

  // Check if any ideas are liked
  const hasLikedIdeas = () => likedIdeas.length > 0;

  // Move to Setup 3: Content Generation
  const handleContinueToContentCreation = () => {
    if (!hasLikedIdeas()) {
      sonnerToast("Error", {
        description: "Please like at least one content idea to continue"
      });
      return;
    }
    
    setState(prev => ({
      ...prev,
      step: 3,
      progress: 0,
      contentGenerated: false
    }));
    
    startContentGeneration();
  };

  // Generate content based on liked idea
  const startContentGeneration = () => {
    // Reset progress
    setState(prev => ({ ...prev, progress: 0 }));
    
    // Get first liked idea
    const postIdeas = JSON.parse(localStorage.getItem('post_ideas') || '[]');
    const likedIdea = postIdeas.find((idea: any) => likedIdeas.includes(idea.id));
    
    if (!likedIdea) {
      sonnerToast("Error", {
        description: "No liked ideas found. Please select an idea first."
      });
      return;
    }
    
    console.log("Starting content generation with website URL:", state.websiteUrl);

    try {
      // Start progress animation
      const progressInterval = setInterval(() => {
        setState(prev => {
          const newProgress = Math.min(prev.progress + 1, 95); // Cap at 95% until we get actual result
          return { ...prev, progress: newProgress };
        });
      }, 100);

      // Get the scraped content and key pages from localStorage
      const scrapedContent = JSON.parse(localStorage.getItem('scraped_content') || '[]');
      const keyContentPages = JSON.parse(localStorage.getItem('key_content_pages') || '[]');

      console.log('Content generation context:', {
        scrapedContentCount: scrapedContent.length,
        keyPagesCount: keyContentPages.length
      });

      // Format the cornerstone content for link generation
      // This matches the database format expected by generate-content-v3
      const cornerstoneContent = keyContentPages.map(page => ({
        title: page.title || '',
        url: page.url || '',
        is_cornerstone: true,
        content: page.content || '',
        digest: page.digest || ''
      }));

      // Format the scraped content to match database format
      const formattedScrapedContent = scrapedContent.map(item => ({
        title: item.title || '',
        url: item.url || item.original_url || '',
        content: item.content || '',
        digest: item.digest || '',
        is_cornerstone: false
      }));

      // Call generate-content-v3 with properly formatted data
      callEdgeFunction('generate-content-v3', {
        website_id: localStorage.getItem('website_id') || '',
        website_url: state.websiteUrl,
        title: likedIdea.title,
        description: likedIdea.description,
        is_onboarding: true,
        cornerstone_content: cornerstoneContent,
        scraped_content: formattedScrapedContent,
        language: localStorage.getItem('website_language') || 'en'
      })
      .then(result => {
        // Clear the progress interval
        clearInterval(progressInterval);
        
        if (result?.content) {
          // Complete the progress bar
          setState(prev => ({
            ...prev,
            progress: 100,
            contentGenerated: true,
            generatedContentTitle: likedIdea.title,
            generatedContentPreview: result.content
          }));
        } else {
          // Handle error case
          clearInterval(progressInterval);
          setState(prev => ({ ...prev, progress: 0 }));
          
          sonnerToast("Error", {
            description: "Failed to generate content. Please try again."
          });
          
          console.error("No content returned from generate-content-v3 function");
        }
      })
      .catch(error => {
        // Clear the progress interval
        clearInterval(progressInterval);
        setState(prev => ({ ...prev, progress: 0 }));
        
        sonnerToast("Error", {
          description: error.message || "Failed to generate content. Please try again."
        });
        
        console.error("Error generating content:", error);
      });
    } catch (error) {
      setState(prev => ({ ...prev, progress: 0 }));
      
      sonnerToast("Error", {
        description: error.message || "Failed to generate content. Please try again."
      });
      
      console.error("Error calling generate-content-v3:", error);
    }
  };
  
  // Regenerate content
  const handleRegenerateContent = () => {
    setState(prev => ({
      ...prev,
      contentGenerated: false,
      progress: 0
    }));
    
    startContentGeneration();
  };

  // Publish content and complete
  const handlePublishContent = () => {
    setState(prev => ({ ...prev, step: 4 })); // Now goes to WordPress integration step
  };

  // Add WordPress connection handlers
  const handleSkipWordPress = () => {
    sonnerToast("Content saved as draft", {
      description: "You can connect WordPress later from the settings."
    });
    setState(prev => ({ ...prev, step: 5 })); // Go to completion
  };

  const handleStartWordPressAuth = () => {
    setState(prev => ({ ...prev, showWpAuthDialog: true }));
  };

  const handleCompleteWordPressAuth = async () => {
    if (!state.wpUsername || !state.wpPassword) {
      setState(prev => ({ 
        ...prev, 
        wpConnectionError: 'Please enter both username and application password' 
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isAuthenticating: true,
      wpConnectionError: null 
    }));

    try {
      // Store credentials in sessionStorage
      const wpCredentials = {
        website_url: state.websiteUrl,
        username: state.wpUsername,
        password: state.wpPassword,
        created_at: new Date().toISOString()
      };
      sessionStorage.setItem('wp_credentials', JSON.stringify(wpCredentials));

      // Test the connection using the Edge Function
      const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/wordpress-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wpUrl: state.websiteUrl,
          username: state.wpUsername,
          password: state.wpPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        sonnerToast.success("WordPress connected successfully!");
        setState(prev => ({ 
          ...prev, 
          showWpAuthDialog: false,
          isAuthenticating: false 
        }));
        // Move to completion step
        setState(prev => ({ ...prev, step: 5 }));
      } else {
        throw new Error(data.error || 'Failed to connect to WordPress');
      }
    } catch (error) {
      console.error('WordPress connection error:', error);
      setState(prev => ({ 
        ...prev, 
        isAuthenticating: false,
        wpConnectionError: error.message || 'Failed to connect to WordPress' 
      }));
    }
  };

  // Complete onboarding and go to dashboard
  const handleComplete = () => {
    sonnerToast("Setup Complete!", {
      description: "You're ready to start creating content."
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border/10 bg-background/98 backdrop-blur-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo className="scale-110" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <AnimatePresence mode="wait">
          {/* Setup 1: Website Onboarding */}
          {state.step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.5,
                ease: "easeInOut",
                opacity: { duration: 0.3 }
              }}
              className="flex flex-col items-center justify-center py-8"
            >
              <div className="w-full max-w-3xl">
                <h2 className="text-2xl font-bold mb-8 text-center">
                  ⚡ Setup 1: Website onboarding
                </h2>
                
                <div className="mb-8">
                  <Progress value={state.progress} className="h-2 mb-2" />
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Step {state.currentStepIndex + 1} of {steps.length}</p>
                    <p className="text-sm font-medium">{Math.round(state.progress)}%</p>
                  </div>
                </div>
                
                <div className="border rounded-lg p-6 mb-8 bg-card">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <span className="bg-primary/10 p-2 rounded-full mr-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </span>
                    {steps[state.currentStepIndex]?.name}
                  </h3>
                  
                  <div className="bg-muted/50 p-4 rounded-md border max-h-[300px] overflow-y-auto">
                    <div className="space-y-2">
                      {steps.slice(0, state.currentStepIndex + 1).reverse().map((step, index) => {
                        const isCurrentStep = index === 0;
                        const isExpanded = isCurrentStep || expandedSteps[step.id];
                        const stepText = isCurrentStep ? state.currentStepText : stepTexts[step.id] || '';
                        
                        return (
                          <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className={`flex items-start gap-3 p-2 rounded-lg ${
                              isCurrentStep 
                                ? 'bg-primary/5 border border-primary/20' 
                                : 'bg-background/50'
                            }`}
                          >
                            <div className="mt-1">
                              {!isCurrentStep ? (
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                              ) : (
                                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div 
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => !isCurrentStep && toggleStepExpanded(step.id)}
                              >
                                <div>
                                  <p className="font-medium">{step.name}</p>
                                </div>
                                {!isCurrentStep && (
                                  <ChevronRight 
                                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                                      isExpanded ? 'rotate-90' : ''
                                    }`}
                                  />
                                )}
                              </div>
                              {isCurrentStep && state.currentStepText && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                  className="mt-2 text-sm"
                                >
                                  {state.currentStepText.split('\n').map((line, i) => (
                                    <p key={i} className={`${i > 0 ? 'mt-1' : ''}`}>{line}</p>
                                  ))}
                                </motion.div>
                              )}
                              {!isCurrentStep && isExpanded && stepText && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="mt-2 text-sm"
                                >
                                  {stepText.split('\n').map((line, i) => (
                                    <p key={i} className={`${i > 0 ? 'mt-1' : ''}`}>{line}</p>
                                  ))}
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Setup 2: Content Idea Selection */}
          {state.step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.5,
                ease: "easeInOut",
                opacity: { duration: 0.3 }
              }}
              className="py-6"
            >
              <div className="w-full max-w-3xl mx-auto">
                <h2 className="text-2xl font-semibold mb-6">
                  🌱✨ Choose your content seeds 🪴
                </h2>
                
                <p className="text-muted-foreground mb-8">
                  ✨ Which ideas do you want to grow?<br />
                  We've planted five fresh content ideas based on your website's tone and style.
                </p>
                
                <div className="grid grid-cols-1 gap-4 mb-8">
                  {/* Show visible ideas */}
                  {JSON.parse(localStorage.getItem('post_ideas') || '[]')
                    .filter((idea: any) => !idea.hidden)
                    .map((idea: any) => (
                      <div 
                        key={idea.id} 
                        className="p-4 rounded-lg border transition-all hover:shadow-subtle bg-card border-border/50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-base text-balance">{idea.title}</h3>
                </div>
                
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleThumbsUp(idea.id)}
                              title="Like this idea"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              <span className="sr-only">Like</span>
                            </Button>
                            
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-gray-400 hover:text-gray-500 hover:bg-gray-50"
                              onClick={() => handleThumbsDown(idea.id)}
                              title="Dislike this idea"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              <span className="sr-only">Dislike</span>
                            </Button>
                        </div>
                      </div>
                        
                        {idea.tags && idea.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {idea.tags.map((tag: string, i: number) => (
                              <Badge 
                                key={i}
                                variant="outline" 
                                className="bg-blue-50 text-blue-700 border-blue-200 text-xs flex items-center gap-1 pr-1"
                              >
                                <span>{tag}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-3 w-3 rounded-full p-0 text-blue-700 hover:bg-blue-200 hover:text-blue-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const updatedIdea = {...idea};
                                    updatedIdea.tags = updatedIdea.tags.filter((t: string) => t !== tag);
                                    
                                    // Update in localStorage
                                    const ideas = JSON.parse(localStorage.getItem('post_ideas') || '[]');
                                    const updatedIdeas = ideas.map((i: any) => 
                                      i.id === idea.id ? updatedIdea : i
                                    );
                                    localStorage.setItem('post_ideas', JSON.stringify(updatedIdeas));
                                    
                                    // Force update
                                    setState(prev => ({...prev}));
                                  }}
                                >
                                  <X className="h-2 w-2" />
                                  <span className="sr-only">Remove keyword</span>
                                </Button>
                              </Badge>
                            ))}
                  </div>
                        )}
                </div>
                    ))}
                  
                  {/* Show message when all ideas are rated */}
                  {JSON.parse(localStorage.getItem('post_ideas') || '[]')
                    .filter((idea: any) => !idea.hidden).length === 0 && (
                    <div className="text-center py-12 border rounded-lg bg-card">
                      <h3 className="text-xl font-medium mb-3">You've rated all the ideas!</h3>
                <p className="text-muted-foreground mb-6">
                        {likedIdeas.length > 0 
                          ? "Great! We'll continue with your selected ideas."
                          : "Let's generate some fresh content ideas for you."}
                      </p>
                      {likedIdeas.length > 0 ? (
                        <Button 
                          onClick={handleContinueToContentCreation}
                          variant="default"
                          className="px-6"
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Continue
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleGenerateNewIdeas}
                          variant="default"
                          className="px-6"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate New Ideas
                        </Button>
                      )}
                        </div>
                      )}
                </div>
                
                {/* Show Continue button when at least one idea is liked */}
                {(likedIdeas.length > 0) && (
                  <div className="flex justify-end items-center border-t pt-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground mr-2">
                        {likedIdeas.length} idea{likedIdeas.length !== 1 ? 's' : ''} selected
                      </span>
                <Button 
                        onClick={handleContinueToContentCreation}
                        className="gap-2"
                >
                        Continue 
                        <ArrowRight className="h-4 w-4" />
                </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Setup 3: Generating First Piece of Content */}
          {state.step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.5,
                ease: "easeInOut",
                opacity: { duration: 0.3 }
              }}
              className="flex flex-col items-center justify-center py-8"
            >
              <div className="w-full max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-8 text-center">
                  📝 Setup 3: Generating your first piece of content
                </h2>
                
                {!state.contentGenerated ? (
                  <>
                    <div className="text-center mb-8">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Wand2 className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                  
                      <h3 className="text-xl font-medium mb-2">🛠️ Generating first draft</h3>
                      <p className="text-muted-foreground mb-4">
                        We're putting your favorite idea into words...
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ✍️ Based on your first selected content idea and your website's tone of voice, we're drafting your first piece of content.
                  </p>
                </div>
                
                    <Progress value={state.progress} className="h-2 mb-2" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Creating your content...</span>
                    <span>{Math.round(state.progress)}%</span>
                  </div>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-8">
                      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
                
                      <h3 className="text-xl font-medium mb-2">📄 Your first draft is ready!</h3>
                      <p className="text-muted-foreground mb-4">
                        Here's your AI-generated content — tailored to your tone and style.
                      </p>
                    </div>
                
                    <div className="border rounded-lg p-6 mb-8 bg-card">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-medium">{state.generatedContentTitle}</h3>
                        <div className="flex items-center gap-2">
                          <Toggle
                            aria-label="Toggle raw content"
                            pressed={state.showRawContent}
                            onPressedChange={(pressed) => setState(prev => ({ ...prev, showRawContent: pressed }))}
                          >
                            <Code className={`h-4 w-4 ${state.showRawContent ? 'text-primary' : 'text-muted-foreground'}`} />
                          </Toggle>
                          <Toggle
                            aria-label="Toggle rendered content"
                            pressed={!state.showRawContent}
                            onPressedChange={(pressed) => setState(prev => ({ ...prev, showRawContent: !pressed }))}
                          >
                            <Eye className={`h-4 w-4 ${!state.showRawContent ? 'text-primary' : 'text-muted-foreground'}`} />
                          </Toggle>
                        </div>
                      </div>
                      
                      {state.showRawContent ? (
                        <div className="font-mono text-sm bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                          {state.generatedContentPreview}
                        </div>
                      ) : (
                        <div 
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: state.generatedContentPreview }}
                        />
                      )}
                    </div>
                    
                    <div className="flex justify-center gap-4">
                      <Button 
                        onClick={handleRegenerateContent}
                        variant="outline"
                      >
                        ♻️ Regenerate
                      </Button>
                      <Button 
                        onClick={handlePublishContent}
                      >
                        📤 Publish
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Setup 4: WordPress Integration */}
          {state.step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.5,
                ease: "easeInOut",
                opacity: { duration: 0.3 }
              }}
              className="flex flex-col items-center justify-center py-8"
            >
              <div className="w-full max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">
                  🔌 Connect to WordPress
                </h2>
                
                <p className="text-muted-foreground mb-8">
                  Connect your WordPress website to automatically publish content. We'll guide you through the process.
                </p>

                <div className="space-y-6">
                  <div className="rounded-lg border bg-card p-4">
                    <h4 className="font-medium mb-2">Before you start:</h4>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      <li>Make sure you're logged into your WordPress admin</li>
                      <li>You'll create a secure connection key that only ContentGardener.ai can use</li>
                      <li>This is more secure than using your admin password</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Create a Secure Connection</Label>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => {
                          if (!state.websiteUrl) {
                            sonnerToast("Error", {
                              description: 'Website URL is not configured'
                            });
                            return;
                          }
                          // Remove protocol if present and add https
                          const cleanUrl = state.websiteUrl.replace(/^https?:\/\//, '');
                          // Check if URL ends with /wp-admin or similar
                          const baseUrl = cleanUrl.replace(/\/(wp-admin|wp-login|wp-content).*$/, '');
                          window.open(`https://${baseUrl}/wp-admin/profile.php#application-passwords-section`, '_blank');
                        }}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Generate Connection Key in WordPress
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        This will open your WordPress admin in a new tab where you can generate a secure connection key.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={handleStartWordPressAuth}
                      >
                        <Link className="h-4 w-4 mr-2" />
                        Connect & Test
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-80">
                            <p>Connect to your WordPress site and test the connection immediately.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                      <p className="text-sm font-medium">What is a Connection Key?</p>
                      <p className="text-sm text-muted-foreground">
                        A connection key (or application password) is a secure way to let ContentGardener.ai connect to your WordPress site. 
                        Unlike your admin password, it has limited access and can be revoked at any time.
                      </p>
                    </div>

                    <div className="flex justify-end gap-4 mt-8">
                      <Button
                        variant="outline"
                        onClick={handleSkipWordPress}
                      >
                        Skip for now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* WordPress Authentication Dialog */}
              <Dialog open={state.showWpAuthDialog} onOpenChange={(open) => setState(prev => ({ ...prev, showWpAuthDialog: open }))}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Connect to WordPress</DialogTitle>
                    <DialogDescription>
                      Enter your WordPress credentials to connect your site
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    {/* Add Generate Key Button at the top */}
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-3">
                      <p className="text-sm font-medium">Need a connection key?</p>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => {
                          if (!state.websiteUrl) {
                            sonnerToast("Error", {
                              description: 'Website URL is not configured'
                            });
                            return;
                          }
                          // Remove protocol if present and add https
                          const cleanUrl = state.websiteUrl.replace(/^https?:\/\//, '');
                          // Check if URL ends with /wp-admin or similar
                          const baseUrl = cleanUrl.replace(/\/(wp-admin|wp-login|wp-content).*$/, '');
                          window.open(`https://${baseUrl}/wp-admin/profile.php#application-passwords-section`, '_blank');
                        }}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Generate Connection Key in WordPress
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        This will open your WordPress admin in a new tab where you can generate a secure connection key.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="wpUsername">WordPress Username</Label>
                      <Input
                        id="wpUsername"
                        value={state.wpUsername}
                        onChange={(e) => setState(prev => ({ ...prev, wpUsername: e.target.value }))}
                        placeholder="Enter your WordPress username"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="wpPassword">Application Password</Label>
                      <Input
                        id="wpPassword"
                        type="text"
                        className="font-mono"
                        value={state.wpPassword}
                        onChange={(e) => setState(prev => ({ ...prev, wpPassword: e.target.value }))}
                        placeholder="xxxx xxxx xxxx xxxx"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste the connection key exactly as shown in WordPress, including spaces
                      </p>
                    </div>

                    {state.wpConnectionError && (
                      <div className="text-sm text-red-500 bg-red-50 p-3 rounded border border-red-200">
                        {state.wpConnectionError}
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setState(prev => ({ ...prev, showWpAuthDialog: false }))}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCompleteWordPressAuth}
                      disabled={state.isAuthenticating}
                    >
                      {state.isAuthenticating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </motion.div>
          )}

          {/* Completion - Now step 5 */}
          {state.step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.5,
                ease: "easeInOut",
                opacity: { duration: 0.3 }
              }}
              className="flex flex-col items-center justify-center min-h-[70vh] text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </motion.div>
              
              <h2 className="text-3xl font-bold mb-3">
                Setup Complete!
              </h2>
              
              <p className="text-lg text-muted-foreground max-w-md mb-8">
                {state.step === 5 ? 
                  "Your content is ready and WordPress is connected. Let's start creating!" :
                  "Your content is saved and ready. You can connect WordPress anytime from settings."}
              </p>
              
              <Button onClick={handleComplete} size="lg" className="px-8">
                Go to Dashboard <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Onboarding; 