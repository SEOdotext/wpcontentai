import { useState, useEffect } from "react";
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
  X
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { Badge } from "@/components/ui/badge";

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
    name: 'Landing Pages',
    description: 'Convert visitors with compelling value propositions.',
    icon: <Layout className="w-5 h-5 text-primary" />,
    recommended: "Best for Conversions 💎"
  }
];

const contentSteps: ContentStep[] = [
  { 
    id: 1, 
    name: "Account Setup", 
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
    name: "Reading Website", 
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
    name: "Language Detection", 
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
    name: "Learning Tone-of-Voice", 
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
    name: "Reading Key Content", 
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
    name: "Suggesting Content Ideas", 
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

// Sample data for website analysis
const siteAnalysis = {
  writingStyle: "Conversational with expert insights",
  targetAudience: "Industry professionals seeking in-depth knowledge",
  toneOfVoice: "Authoritative yet approachable, with a touch of enthusiasm",
  contentTypes: ["Educational in-depth guides", "Industry trend analyses", "Practical how-to content"],
  language: "Professional with clear explanations of complex topics",
  keyPhrases: ["proven solutions", "insider perspective", "actionable insights"]
};

// Sample data for keyword opportunities
const keywordOpportunities = [
  {
    keyword: "10 Simple Ways to Improve Your Website's Visibility",
    searchVolume: "5,200 searches/month",
    currentRank: "not showing up yet",
    difficulty: "Not too hard",
    potential: "Very promising"
  },
  {
    keyword: "The Complete Guide to Writing Engaging Website Content",
    searchVolume: "3,800 searches/month",
    currentRank: "showing up on page 3",
    difficulty: "Easy",
    potential: "Excellent chance"
  },
  {
    keyword: "Essential Tools for Website Optimization in 2024",
    searchVolume: "4,500 searches/month",
    currentRank: "not showing up yet",
    difficulty: "Not too hard",
    potential: "Very promising"
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
    name: "Account Setup", 
    description: "Creating your workspace"
  },
  { 
    id: 2, 
    name: "Reading Website", 
    description: "Analyzing your website"
  },
  { 
    id: 3, 
    name: "Language Detection", 
    description: "Identifying website language"
  },
  { 
    id: 4, 
    name: "Learning Tone-of-Voice", 
    description: "Understanding your style"
  },
  { 
    id: 5, 
    name: "Reading Key Content", 
    description: "Analyzing important pages"
  },
  { 
    id: 6, 
    name: "Suggesting Content Ideas", 
    description: "Creating content ideas"
  }
];

const Onboarding = () => {
  const [state, setState] = useState<OnboardingState>({
    step: 1, // Start with Setup 1
    websiteUrl: localStorage.getItem('onboardingWebsite') || 'https://example.com',
    progress: 0,
    currentStepIndex: 0,
    currentStepText: '',
    selectedType: null,
    contentGenerated: false,
    generatedContentTitle: '',
    generatedContentPreview: '',
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Track liked ideas
  const [likedIdeas, setLikedIdeas] = useState<string[]>([]);
  
  useEffect(() => {
    // Get URL from query parameters if exists
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
    
    // Start onboarding process immediately
    startSetup1();
  }, []);

  // Helper function to call Supabase Edge Functions directly
  const callEdgeFunction = async (functionName: string, body: any) => {
    try {
      // Convert any snake_case keys to camelCase or dash-case for the API
      const formattedBody = Object.entries(body).reduce((acc, [key, value]) => {
        // Try with camelCase
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        acc[camelKey] = value;
        return acc;
      }, {});
      
      console.log(`Calling edge function: ${functionName} with formatted body:`, formattedBody);
      
      // Use a direct fetch to the Supabase Edge Function
      const resp = await fetch(`https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formattedBody)
      });
      
      console.log(`Response status for ${functionName}:`, resp.status);
      
      if (!resp.ok) {
        const errorText = await resp.text().catch(() => 'Unknown error');
        console.error(`Error response from ${functionName}:`, errorText);
        throw new Error(`Function ${functionName} returned status ${resp.status}: ${errorText}`);
      }
      
      const data = await resp.json();
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
    
    // Create website and organization IDs
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
    
    // Setup 1 steps
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
          
          // Try multiple parameter formats to diagnose issues
          const payloads = [
            { website_id: websiteId, website_url: state.websiteUrl },
            { websiteId: websiteId, url: state.websiteUrl },
            { websiteId, url: state.websiteUrl, customSitemapUrl: null }
          ];
          
          let result = null;
          let lastError = null;
          
          // Try each payload format
          for (const payload of payloads) {
            try {
              console.log("Trying get-sitemap-pages with payload:", payload);
              result = await callEdgeFunction('get-sitemap-pages', payload);
              if (result) {
                console.log("Success with payload:", payload);
                break;
              }
            } catch (error) {
              console.error("Failed with payload:", payload, error);
              lastError = error;
            }
          }
          
          if (result?.pages && result.pages.length > 0) {
            const limitedPages = result.pages.slice(0, 200);
            localStorage.setItem('website_content', JSON.stringify(limitedPages));
            return `We've just read your website — exciting! 😄 We can always do some more reading later.\n\n🧠 ${limitedPages.length} pages have been loaded from your sitemap.`;
          } else {
            // If no pages from sitemap, try crawling
            try {
              // Try crawl-website-pages function with multiple formats
              for (const payload of payloads) {
                try {
                  console.log("Trying crawl-website-pages with payload:", payload);
                  const crawlResult = await callEdgeFunction('crawl-website-pages', payload);
                  if (crawlResult?.pages && crawlResult.pages.length > 0) {
                    const limitedPages = crawlResult.pages.slice(0, 200);
                    localStorage.setItem('website_content', JSON.stringify(limitedPages));
                    return `We've just read your website — exciting! 😄 We can always do some more reading later.\n\n🧠 ${limitedPages.length} pages have been loaded by scanning your website.`;
                  }
                } catch (error) {
                  console.error("Failed crawl with payload:", payload, error);
                }
              }
              
              // If we got here, all attempts failed
              createMockPages();
              return "We've just read your website — exciting! 😄 We can always do some more reading later.";
            } catch (crawlError) {
              console.error("Error crawling website:", crawlError);
              // If both methods fail, use mock data
              createMockPages();
              return "We've just read your website — exciting! 😄 We can always do some more reading later.";
            }
          }
        } catch (error) {
          console.error("Error reading website:", error);
          // Fallback to mock data if both methods fail
          createMockPages();
          return "We've just read your website — exciting! 😄 We can always do some more reading later.";
        }
      },
      
      // Step 3: Language Detection (hidden from user)
      async () => {
        setState(prev => ({ ...prev, currentStepIndex: 2, currentStepText: "Detecting language..." }));
        try {
          const result = await callEdgeFunction('detect-website-language', {
            website_id: websiteId,
            url: state.websiteUrl
          });
          
          if (result?.language) {
            const websiteInfo = JSON.parse(localStorage.getItem('website_info') || '{}');
            websiteInfo.language = result.language;
            localStorage.setItem('website_info', JSON.stringify(websiteInfo));
            console.log(`Language detected: ${result.language}`);
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
          const result = await callEdgeFunction('suggest-key-content', {
            website_id: websiteId
          });
          
          if (result?.pages && result.pages.length > 0) {
            const selectedPages = result.pages.slice(0, 5);
            localStorage.setItem('key_content_pages', JSON.stringify(selectedPages));
            
            const pageUrls = selectedPages.map((page: any) => {
              const url = page.url.replace(state.websiteUrl, '');
              return url || '/';
            }).join('\n');
            
            return `🗣️ Learning Tone-of-Voice\n\nWe're learning how you sound so we can write like you.\n🔍 Selected and prioritised these key pages to understand your tone and style:\n${pageUrls}\n(Don't worry, you can adjust this later.)`;
          } else {
            // Use mock data if API fails
            selectMockKeyPages();
            const selectedPages = JSON.parse(localStorage.getItem('key_content_pages') || '[]');
            const pageUrls = selectedPages.map((page: any) => {
              const url = page.url.replace(state.websiteUrl, '');
              return url || '/';
            }).join('\n');
            
            return `🗣️ Learning Tone-of-Voice\n\nWe're learning how you sound so we can write like you.\n🔍 Selected and prioritised these key pages to understand your tone and style:\n${pageUrls}\n(Don't worry, you can adjust this later.)`;
          }
        } catch (error) {
          console.error("Error learning tone:", error);
          // Use mock data if API fails
          selectMockKeyPages();
          
          return "🗣️ Learning Tone-of-Voice\n\nWe're learning how you sound so we can write like you.";
        }
      },
      
      // Step 5: Reading Key Content
      async () => {
        setState(prev => ({ ...prev, currentStepIndex: 4, currentStepText: "Reading key content..." }));
        try {
          const keyPages = JSON.parse(localStorage.getItem('key_content_pages') || '[]');
          let success = false;
          
          if (keyPages.length > 0) {
            try {
              // Try to scrape content for each key page
              for (const page of keyPages) {
                await callEdgeFunction('scrape-content', {
                  website_id: websiteId,
                  url: page.url
                });
              }
              success = true;
            } catch (scrapeError) {
              console.error("Error scraping content:", scrapeError);
              // Continue with mock data on error
            }
          }
          
          return "📚 Reading Key Content\n\nWe're digging deeper into your key content to fully understand your voice and topics.\n\nYour most important pages are now being read — this helps us learn how to write like you.";
        } catch (error) {
          console.error("Error reading content:", error);
          return "📚 Reading Key Content\n\nWe're digging deeper into your key content to fully understand your voice and topics.";
        }
      },
      
      // Step 6: Suggesting Content Ideas
      async () => {
        setState(prev => ({ ...prev, currentStepIndex: 5, currentStepText: "Generating ideas..." }));
        try {
          const result = await callEdgeFunction('generate-post-ideas', {
            website_id: websiteId
          });
          
          if (result?.ideas && result.ideas.length > 0) {
            localStorage.setItem('post_ideas', JSON.stringify(result.ideas));
            return "💡 Suggesting Relevant Content Ideas\n\nYour content garden is blooming! 🌱\n\nWe've generated 5 unique content ideas based on your tone and themes.\n🧠 You'll now see them and get to pick your favorites.";
        } else {
            // Fallback with mock data if the API returns no ideas
            createMockPostIdeas();
            return "💡 Suggesting Relevant Content Ideas\n\nYour content garden is blooming! 🌱\n\nWe've generated 5 unique content ideas based on your tone and themes.\n🧠 You'll now see them and get to pick your favorites.";
          }
        } catch (error) {
          console.error("Error generating ideas:", error);
          // Fallback with mock data if the API fails
          createMockPostIdeas();
          return "💡 Suggesting Relevant Content Ideas\n\nYour content garden is blooming! 🌱\n\nWe've generated 5 unique content ideas based on your tone and themes.\n🧠 You'll now see them and get to pick your favorites.";
        }
      }
    ];
    
    // Run all setup1 steps in sequence
    const totalSteps = setup1Steps.length;
    for (let i = 0; i < totalSteps; i++) {
      // Update progress
      setState(prev => ({
        ...prev,
        progress: (i / totalSteps) * 100
      }));
      
      // Run current step
      const message = await setup1Steps[i]();
      
      // Display message if any
      if (message) {
        setState(prev => ({ ...prev, currentStepText: message }));
        await new Promise(r => setTimeout(r, 2000)); // Pause to show message
      }
    }
    
    // Complete Setup 1
    setState(prev => ({
      ...prev,
      progress: 100,
      step: 2 // Move to Setup 2: Content Idea Selection
    }));
  };

  // Set default language to English
  const setDefaultLanguage = () => {
    const websiteInfo = JSON.parse(localStorage.getItem('website_info') || '{}');
    websiteInfo.language = 'en';
    localStorage.setItem('website_info', JSON.stringify(websiteInfo));
    console.log("Using default language: en");
  };

  // Create mock pages for development
  const createMockPages = () => {
    const mockPages = [
      { url: state.websiteUrl, title: "Home Page" },
      { url: `${state.websiteUrl}/about`, title: "About Us" },
      { url: `${state.websiteUrl}/services`, title: "Our Services" },
      { url: `${state.websiteUrl}/contact`, title: "Contact Us" },
      { url: `${state.websiteUrl}/blog`, title: "Blog" },
    ];
    localStorage.setItem('website_content', JSON.stringify(mockPages));
  };

  // Select mock key pages for development
  const selectMockKeyPages = () => {
    const websiteContent = JSON.parse(localStorage.getItem('website_content') || '[]');
    const selectedPages = websiteContent.slice(0, Math.min(5, websiteContent.length));
    localStorage.setItem('key_content_pages', JSON.stringify(selectedPages));
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
    
    toast({
      title: "Idea saved!",
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

  // Generate new ideas if all are rated
  const handleGenerateNewIdeas = () => {
      toast({
      title: "Generating new ideas",
      description: "Finding fresh content suggestions for you..."
    });
    
    callEdgeFunction('generate-post-ideas', { 
      website_id: localStorage.getItem('website_id') || '' 
    })
      .then(result => {
        if (result?.ideas && result.ideas.length > 0) {
          localStorage.setItem('post_ideas', JSON.stringify(result.ideas));
          setState(prev => ({ ...prev }));
          toast({
            title: "New ideas generated",
            description: "We've created fresh content ideas for you."
          });
        } else {
          toast({
            title: "Error",
            description: "No ideas returned from API. Please try again."
          });
        }
      })
      .catch(error => {
        console.error("Error generating ideas:", error);
        toast({
          title: "Error",
          description: "Failed to generate ideas. Please try again."
        });
      });
  };

  // Create mock post ideas for development and fallback
  const createMockPostIdeas = () => {
    const ideas = [
      {
        id: 'idea-1',
        title: 'The Ultimate Guide to Creating Engaging Content',
        description: 'Discover proven strategies to create content that resonates with your audience and drives engagement.',
        tags: ['Content Strategy', 'Engagement'],
        hidden: false
      },
      {
        id: 'idea-2',
        title: '10 Ways to Improve Your Website SEO Today',
        description: 'Practical and actionable tips to boost your website\'s search engine rankings quickly.',
        tags: ['SEO', 'Website Optimization'],
        hidden: false
      },
      {
        id: 'idea-3',
        title: 'How to Build a Strong Brand Voice Online',
        description: 'Learn the key elements that define a memorable brand voice and how to implement them consistently.',
        tags: ['Branding', 'Marketing'],
        hidden: false
      },
      {
        id: 'idea-4',
        title: 'Understanding Your Audience: Data-Driven Content Creation',
        description: 'Leverage analytics and user data to create content that perfectly matches your audience\'s needs.',
        tags: ['Analytics', 'Content Strategy'],
        hidden: false
      },
      {
        id: 'idea-5',
        title: 'The Future of Content Marketing: Trends to Watch',
        description: 'Stay ahead of the curve with insights into emerging content marketing trends and technologies.',
        tags: ['Content Marketing', 'Trends'],
        hidden: false
      }
    ];
    
    localStorage.setItem('post_ideas', JSON.stringify(ideas));
    localStorage.setItem('mock_post_ideas', JSON.stringify(ideas));
  };

  // Check if any ideas are liked
  const hasLikedIdeas = () => likedIdeas.length > 0;

  // Move to Setup 3: Content Generation
  const handleContinueToContentCreation = () => {
    if (!hasLikedIdeas()) {
      toast({
        title: "Select an idea",
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
      toast({
        title: "Error",
        description: "No liked ideas found. Please select an idea first."
      });
      return;
    }
    
    // For this demo, we'll still use the simulation since the generate-content-v3 endpoint
    // might not be fully implemented in the current project state
    const interval = setInterval(() => {
      setState(prev => {
        const newProgress = prev.progress + 1;
        
        if (newProgress >= 100) {
          clearInterval(interval);
          
          // Show generated content
          setTimeout(() => {
            setState(prev => ({
              ...prev,
              contentGenerated: true,
              generatedContentTitle: likedIdea.title,
              generatedContentPreview: `This is a preview of the AI-generated content for "${likedIdea.title}".\n\nThis content has been tailored to match your website's tone and style, focusing on the key themes you've highlighted.\n\nThe full article includes actionable insights and engaging examples.`
            }));
          }, 500);
          
          return { ...prev, progress: 100 };
        }
        
        return { ...prev, progress: newProgress };
      });
    }, 50);
    
    // In a real implementation, we would use something like:
    /*
    callEdgeFunction('generate-content-v3', {
      websiteId: localStorage.getItem('website_id') || '',
      title: likedIdea.title,
      description: likedIdea.description
    })
      .then(result => {
        if (result?.content) {
          setState(prev => ({
            ...prev,
            contentGenerated: true,
            generatedContentTitle: likedIdea.title,
            generatedContentPreview: result.content
          }));
        } else {
          // Handle failure
          toast({
            title: "Error",
            description: "Failed to generate content. Please try again."
          });
        }
      })
      .catch(error => {
        console.error("Error generating content:", error);
        toast({
          title: "Error",
          description: "Failed to generate content. Please try again."
        });
      });
    */
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
    toast({
      title: "Content published!",
      description: "Your content has been published successfully."
    });
    
    setState(prev => ({ ...prev, step: 4 }));
  };

  // Complete onboarding and go to dashboard
  const handleComplete = () => {
    toast({
      title: "Setup Complete!",
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
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <div className="w-full max-w-3xl">
                <h2 className="text-2xl font-bold mb-8 text-center">
                  ⚡ Setup 1: Website Onboarding
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
                  
                  <p className="text-muted-foreground mb-6">
                    {steps[state.currentStepIndex]?.description}
                  </p>
                  
                  <div className="bg-muted/50 p-4 rounded-md border">
                    <div className="flex">
                      <Sparkles className="w-5 h-5 text-primary mr-3 animate-pulse mt-1" />
                      <div>
                        {state.currentStepText.split('\n').map((line, i) => (
                          <p key={i} className={`font-medium ${i > 0 ? 'mt-2' : ''}`}>{line}</p>
                        ))}
                      </div>
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
              transition={{ duration: 0.3 }}
              className="py-6"
            >
              <div className="w-full max-w-5xl mx-auto">
                <h2 className="text-2xl font-semibold mb-6">
                  🌱✨ Choose Your Content Seeds 🪴
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
                              className="h-7 w-7"
                              onClick={() => handleThumbsUp(idea.id)}
                              title="Like this idea"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              <span className="sr-only">Like</span>
                            </Button>
                            
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
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
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <div className="w-full max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-8 text-center">
                  📝 Setup 3: Generating Your First Piece of Content
                </h2>
                
                {!state.contentGenerated ? (
                  <>
                    <div className="text-center mb-8">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Wand2 className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                  
                      <h3 className="text-xl font-medium mb-2">🛠️ Generating First Draft</h3>
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
                
                      <h3 className="text-xl font-medium mb-2">📄 Your First Draft Is Ready!</h3>
                      <p className="text-muted-foreground mb-4">
                        Here's your AI-generated content — tailored to your tone and style.
                      </p>
                    </div>
                
                    <div className="border rounded-lg p-6 mb-8 bg-card">
                      <h3 className="text-xl font-medium mb-4">{state.generatedContentTitle}</h3>
                      <div className="prose prose-sm max-w-none mb-4">
                        {state.generatedContentPreview.split('\n').map((line, i) => (
                          <p key={i} className={`${i > 0 ? 'mt-2' : ''}`}>{line}</p>
                        ))}
                </div>
                      <p className="text-muted-foreground italic text-sm">
                        View the full content for more...
                      </p>
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

          {/* Completion */}
          {state.step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
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
                You're all set!
              </h2>
              
              <p className="text-lg text-muted-foreground max-w-md mb-8">
                Your website's content DNA is mapped and we're ready to create perfectly matched content for your audience.
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