import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';
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
  Globe,
  Mail,
  Sprout
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
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from 'react-helmet-async';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import { useOrganisation } from '@/context/OrganisationContext';
import { useWebsites } from '@/context/WebsitesContext';
import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FcGoogle } from 'react-icons/fc';
import { transferDataToDatabase } from '@/api/onboardingImport';
import { defaultSettings } from '@/context/SettingsContext';

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
  step: number | 'email-verification';
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
  postingFrequency: number;
  postingDays: string[];
  scheduledDates: string[];
  showSignupModal: boolean;
  verificationEmail?: string;
  showEmailVerification: boolean;
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
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
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

// Add SignupModal component
const SignupModal = ({ 
  isOpen, 
  onClose, 
  onSignup,
  onGoogleSignup 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSignup: (email: string, password: string) => Promise<void>;
  onGoogleSignup: () => Promise<void>;
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await onSignup(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      await onGoogleSignup();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up with Google');
      setGoogleLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isLoading && !googleLoading && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create your account</DialogTitle>
          <DialogDescription>
            Save your schedule and start publishing content with AI.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          type="button" 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2" 
          onClick={handleGoogleSignup}
          disabled={googleLoading || isLoading}
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FcGoogle className="h-5 w-5" />
          )}
          <span>Sign up with Google</span>
        </Button>
        
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-2 text-xs text-muted-foreground">
              OR
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || googleLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account with Email'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Add these components before the Onboarding component
const AnimatedResult: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 10 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

const AnimatedListItem: React.FC<{ children: React.ReactNode, index: number }> = ({ children, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Trigger animation after component mounts with staggered delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100 + (index * 100)); // Stagger the animations
    
    return () => clearTimeout(timer);
  }, [index]);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="py-1"
    >
      {children}
    </motion.div>
  );
};

const Onboarding = () => {
  const navigate = useNavigate();
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
    wpConnectionError: null,
    postingFrequency: 3, // Default to 3 posts per week
    postingDays: ['monday', 'wednesday', 'friday'], // Default posting days
    scheduledDates: [], // Will be populated when scheduling
    showSignupModal: false,
    showEmailVerification: false,
  });
  
  // Track liked ideas
  const [likedIdeas, setLikedIdeas] = useState<string[]>([]);
  
  // Track expanded states for each step
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  
  // Store step texts for completed steps
  const [stepTexts, setStepTexts] = useState<Record<number, string>>({});
  
  // Add a ref to track if setup has started
  const setupStarted = React.useRef(false);

  // Helper function to update URL parameters
  const updateUrlParams = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams(window.location.search);
    
    // Update each parameter
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      } else {
        searchParams.delete(key);
      }
    });
    
    // Update URL without reloading the page
    window.history.replaceState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
  };

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
    const stepParam = params.get('step');
    const transferParam = params.get('transfer');
    const onboardingParam = params.get('onboarding');
    
    // Handle data transfer after email verification
    if (transferParam === 'true' && onboardingParam === 'complete') {
      const userId = localStorage.getItem('pending_user_id');
      if (userId) {
        console.log('Auto-transferring data after email verification for user:', userId);
        transferDataToDatabase(userId).catch(error => {
          console.error('Error auto-transferring data:', error);
          toast.error("Error completing setup: " + (error.message || "Failed to complete setup. Please try again."));
        });
      }
    }
    
    // Handle website URL parameter
    if (urlParam) {
      let formattedUrl = urlParam;
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      
      // Store the URL and update state
      localStorage.setItem('onboardingWebsite', formattedUrl);
      setState(prev => ({ ...prev, websiteUrl: formattedUrl }));
    }
    
    // Handle step parameter
    if (stepParam) {
      // Map step parameter to step number
      const stepMap: Record<string, number> = {
        'ideas': 2,
        'post-draft': 3,
        'scheduling': 4,
        'auth': 5,
        'integration': 6 // Completion
      };
      
      const stepNumber = stepMap[stepParam];
      
      if (stepNumber) {
        console.log(`Navigating to step ${stepNumber} based on URL parameter`);
        
        // Only allow navigation to steps that are implemented
        if (stepNumber <= 4) { // Updated to include scheduling step
          setState(prev => ({ ...prev, step: stepNumber }));
          
          // If we're skipping to a later step, we need to ensure previous steps are completed
          if (stepNumber > 1) {
            // Mark setup as started to prevent automatic start
            setupStarted.current = true;
            
            // Set progress to 100% for previous steps
            setState(prev => ({ 
              ...prev, 
              progress: 100,
              currentStepIndex: steps.length - 1
            }));
          }
        } else {
          // For steps that are coming soon, show a toast message
          toast.info("Coming Soon: This feature is coming soon! Starting from the beginning.");
        }
      }
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
    const organisationId = localStorage.getItem('organisation_id') || uuidv4();
    
    // Store IDs in localStorage
    localStorage.setItem('website_id', websiteId);
    localStorage.setItem('organisation_id', organisationId);
    
    // Create organisation name from URL
    const urlWithoutProtocol = state.websiteUrl.replace(/^https?:\/\//, '');
    const domainParts = urlWithoutProtocol.split('.');
    const organisationName = domainParts.length > 1 ? domainParts[domainParts.length - 2] : urlWithoutProtocol;
    
    // Store website info
    const websiteInfo = {
      id: websiteId,
      url: state.websiteUrl,
      name: organisationName,
      organisation_id: organisationId,
      created_at: new Date().toISOString()
    };
    localStorage.setItem('website_info', JSON.stringify(websiteInfo));
    
    // Store organisation info
    const organisationInfo = {
      id: organisationId,
      name: organisationName.charAt(0).toUpperCase() + organisationName.slice(1),
      created_at: new Date().toISOString()
    };
    localStorage.setItem('organisation_info', JSON.stringify(organisationInfo));
    
    // Also store the full organisation object for the OrganisationContext
    console.log('Storing full organisation data in localStorage for OrganisationContext');
    localStorage.setItem('currentOrganisation', JSON.stringify(organisationInfo));
    
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

                  // Store the error in onboarding analytics
                  try {
                    await callEdgeFunction('store-onboarding-analytics', {
                      website_id: websiteId,
                      website_url: state.websiteUrl,
                      status: 'error',
                      error: error.message,
                      error_code: error.code || 'CRAWL_ERROR',
                      error_step: '2',
                      error_details: error.details || error.message,
                      worker_response: error.response || null
                    });
                  } catch (storeError) {
                    console.error("Failed to store error in analytics:", storeError);
                  }

              throw error; // Let the error propagate up
              }
              
              // If we got here, all attempts failed
            throw new Error("Could not find any pages on the website. Please check the URL and try again.");
          }
        } catch (error) {
          console.error("Error reading website:", error);
          
          // Store the error in onboarding analytics
          try {
            await callEdgeFunction('store-onboarding-analytics', {
              website_id: websiteId,
              website_url: state.websiteUrl,
              status: 'error',
              error: `Error in step 2: ${error.message}`,
              error_code: error.code || 'WEBSITE_READ_ERROR',
              error_step: '2',
              error_details: error.details || error.message,
              worker_response: error.response || null
            });
          } catch (storeError) {
            console.error("Failed to store error in analytics:", storeError);
          }
          
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
        setState(prev => ({ ...prev, currentStepIndex: 3, currentStepText: "Learning how you sound so we can write like you.\n🔍 Selecting and prioritising key pages to understand your tone." }));
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
          
          // Update the step text to show a more fluid message
          setState(prev => ({ 
            ...prev, 
            currentStepText: "Learning how you sound so we can write like you.\n🔍 Selecting and prioritising key pages to understand your tone and style."
          }));
          
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
          
          if (!result) {
            throw new Error("No response received from suggest-key-content");
          }
          
          if (result.error) {
            throw new Error(result.error.message || "Error from suggest-key-content");
          }
          
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
            });
            
            // Add a small delay before showing the final message to make the transition smoother
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Return the message with the page URLs
            return `We've learned how you sound so we can write like you.\n🔍 Selected and prioritised these key pages to understand your tone and style:\n${pageUrls.join('\n')}\n(Don't worry, you can adjust this later.)`;
          } else {
            // Don't use mock data - show the actual error
            console.error("No suggestions returned from suggest-key-content:", result);
            throw new Error("Could not identify key content pages. Please try a different website.");
          }
        } catch (error) {
          console.error('Error learning tone:', error);
          
          // Don't mask errors with mock data - show the real issue
          toast.error("Error generating ideas: " + (error.message || "Failed to generate content ideas. Please try again."));
          throw error;
        }
      },
      
      // Step 5: Reading Key Content
      async () => {
        setState(prev => ({ ...prev, currentStepIndex: 4, currentStepText: "We're digging deeper into your key content to fully understand your voice and topics." }));
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
                
                // Update the step text to show a more fluid message for each page
                setState(prev => ({ 
                  ...prev, 
                  currentStepText: `We're digging deeper into your key content to fully understand your voice and topics.\n🔍 Analyzing: ${page.title || 'Page'}\n${pageUrl}`
                }));
                
                // Add a small delay to make the animation feel more natural
                await new Promise(resolve => setTimeout(resolve, 800));
                
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
          
          // Add a small delay before showing the final message to make the transition smoother
          await new Promise(resolve => setTimeout(resolve, 500));
          
          return "We've successfully analyzed your key content to understand your voice and topics.\n\nYour most important pages have been processed — this helps us learn how to write like you.";
        } catch (error) {
          console.error("Error reading content:", error);
          // Don't mask errors with mock data - show the real issue
          throw error;
        }
      },
      
      // Step 6: Suggesting Content Ideas
      async () => {
        setState(prev => ({ ...prev, currentStepIndex: 5, currentStepText: "Your content garden is blooming! 🌱\n\nWe're generating unique content ideas based on your tone and themes." }));
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
          
          // Add a small delay to make the animation feel more natural
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Update the step text to show progress
          setState(prev => ({ 
            ...prev, 
            currentStepText: "Your content garden is blooming! 🌱\n\nWe're generating unique content ideas based on your tone and themes.\n🌱 Planting seeds of inspiration..."
          }));
          
          // Add another small delay to make the animation feel more natural
          await new Promise(resolve => setTimeout(resolve, 800));
          
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
          
          // Update the step text to show more progress
          setState(prev => ({ 
            ...prev, 
            currentStepText: "Your content garden is blooming! 🌱\n\nWe're generating unique content ideas based on your tone and themes.\n🌱 Planting seeds of inspiration...\n🌿 Growing your content ideas..."
          }));
          
          const result = await callEdgeFunction('generate-post-ideas', payload);
          
          console.log("Generate post ideas result:", result);
          
          // Add a small delay before showing the final message to make the transition smoother
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (result?.ideas && result.ideas.length > 0) {
            // Store the ideas in localStorage
            localStorage.setItem('post_ideas', JSON.stringify(result.ideas));
            return "Your content garden is blooming! 🌱\n\nWe've generated 5 unique content ideas based on your tone and themes.\n🧠 You'll now see them and get to pick your favorites.";
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
            return "Your content garden is blooming! 🌱\n\nWe've generated unique content ideas based on your tone and themes.\n🧠 You'll now see them and get to pick your favorites.";
          } else {
            console.warn('No ideas returned from generate-post-ideas function');
            // Don't use mock data - show the actual error
            throw new Error("No content ideas could be generated. API returned empty result.");
          }
        } catch (error) {
          console.error('Error generating ideas:', error);
          
          // Don't mask errors with mock data - show the real issue
          toast.error("Error generating ideas: " + (error.message || "Failed to generate content ideas. Please try again."));
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
          toast("Error", {
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
        
        toast("Error Completing Setup", {
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
    
    // Update URL to reflect current step
    updateUrlParams({ step: 'ideas' });
    } catch (error) {
      console.error("Error in setup process:", error);
      toast("Setup Error", {
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
    
    toast.success("Idea added to your content calendar! We'll generate content based on this topic.");
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
    toast.promise(
      generateNewIdeas(),
      {
        loading: 'Generating new ideas...',
        success: 'Ideas generated successfully!',
        error: 'Failed to generate ideas'
      }
    );
  };

  // Check if any ideas are liked
  const hasLikedIdeas = () => likedIdeas.length > 0;

  // When ideas are first shown (in startSetup1 after generating ideas)
  const handleIdeasGenerated = async (ideas: any[]) => {
    try {
      const website_id = localStorage.getItem('website_id');
      const website_url = localStorage.getItem('onboardingWebsite');
      
      await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/store-onboarding-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          website_id,
          website_url,
          status: 'ideas_shown'
        })
      });
    } catch (error) {
      console.error('Error updating onboarding analytics:', error);
    }
  };

  // Move to Setup 3: Content Generation
  const handleContinueToContentCreation = async () => {
    if (!hasLikedIdeas()) {
      toast.error("Please like at least one content idea to continue");
      return;
    }

    // Get all liked ideas before continuing
    const postIdeas = JSON.parse(localStorage.getItem('post_ideas') || '[]');
    const likedIdeasData = postIdeas.filter((idea: any) => likedIdeas.includes(idea.id));

    // Update onboarding analytics with selected ideas and status
    try {
      const website_id = localStorage.getItem('website_id');
      const website_url = localStorage.getItem('onboardingWebsite');
      
      await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/store-onboarding-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          website_id,
          website_url,
          status: 'ideas_accepted',
          post_theme_suggestions: likedIdeasData // Store the selected ideas here
        })
      });
    } catch (error) {
      console.error('Error updating onboarding analytics:', error);
    }
    
    setState(prev => ({
      ...prev,
      step: 3,
      progress: 0,
      contentGenerated: false
    }));
    
    // Update URL to reflect current step
    updateUrlParams({ step: 'post-draft' });
    
    startContentGeneration();
  };

  // When content is generated and shown
  const handleContentGenerated = async (content: any) => {
    try {
      const website_id = localStorage.getItem('website_id');
      const website_url = localStorage.getItem('onboardingWebsite');
      
      await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/store-onboarding-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          website_id,
          website_url,
          status: 'post_shown'
        })
      });
    } catch (error) {
      console.error('Error updating onboarding analytics:', error);
    }
  };

  // Generate content based on liked idea
  const startContentGeneration = () => {
    // Reset progress
    setState(prev => ({ ...prev, progress: 0 }));
    
    // Get first liked idea
    const postIdeas = JSON.parse(localStorage.getItem('post_ideas') || '[]');
    const likedIdea = postIdeas.find((idea: any) => likedIdeas.includes(idea.id));
    
    if (!likedIdea) {
      toast.error("No liked ideas found. Please select an idea first.");
      return;
    }
    
    console.log("Starting content generation with website URL:", state.websiteUrl);

    try {
      // Start progress animation - adjusted to take approximately 15 seconds
      // Changed to 1% every 200ms to make the loading take around 15 seconds
      const progressInterval = setInterval(() => {
        setState(prev => {
          const newProgress = Math.min(prev.progress + 1, 95); // Increment by 1% each time
          
          // Update the step text based on progress to make it more animated
          let stepText = "Analyzing your tone and style...";
          
          if (newProgress < 20) {
            stepText = "Analyzing your tone and style...";
          } else if (newProgress < 40) {
            stepText = "Analyzing your tone and style...\n\nStructuring your content...";
          } else if (newProgress < 60) {
            stepText = "Analyzing your tone and style...\n\nStructuring your content...\n\nWriting engaging paragraphs...";
          } else if (newProgress < 80) {
            stepText = "Analyzing your tone and style...\n\nStructuring your content...\n\nWriting engaging paragraphs...\n\nPolishing your content...";
          } else {
            stepText = "Analyzing your tone and style...\n\nStructuring your content...\n\nWriting engaging paragraphs...\n\nPolishing your content...\n\nAlmost ready...";
          }
          
          return { ...prev, progress: newProgress, currentStepText: stepText };
        });
      }, 200); // Set to 200ms interval

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
          // Add a small delay before showing the final result to make the transition smoother
          setTimeout(() => {
            // Complete the progress bar
            setState(prev => ({
              ...prev,
              progress: 100,
              contentGenerated: true,
              generatedContentTitle: likedIdea.title,
              generatedContentPreview: result.content,
              currentStepText: "Analyzing your tone and style...\n\nStructuring your content...\n\nWriting engaging paragraphs...\n\nPolishing your content...\n\nYour content is ready!"
            }));

            // Store generated content in localStorage
            const generatedContent = {
              title: likedIdea.title,
              content: result.content,
              status: 'textgenerated',
              created_at: new Date().toISOString(),
              website_id: localStorage.getItem('website_id')
            };
            localStorage.setItem('generated_content', JSON.stringify(generatedContent));

            // Call handleContentGenerated to update status
            handleContentGenerated(generatedContent);
          }, 500); // Add a 500ms delay for a smoother transition
        } else {
          // Handle error case
          clearInterval(progressInterval);
          setState(prev => ({ ...prev, progress: 0 }));
          
          toast.error("Failed to generate content. Please try again.");
          
          console.error("No content returned from generate-content-v3 function");
        }
      })
      .catch(error => {
        // Clear the progress interval
        clearInterval(progressInterval);
        setState(prev => ({ ...prev, progress: 0 }));
        
        toast.error("Failed to generate content. Please try again.");
        
        console.error("Error generating content:", error);
      });
    } catch (error) {
      setState(prev => ({ ...prev, progress: 0 }));
      
      toast("Error", {
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

  // Move to scheduling step
  const handleContinueToScheduling = async () => {
    // Update onboarding analytics with generated content and status
    try {
      const website_id = localStorage.getItem('website_id');
      const website_url = localStorage.getItem('onboardingWebsite');
      const generatedContent = JSON.parse(localStorage.getItem('generated_content') || '{}');
      
      await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/store-onboarding-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          website_id,
          website_url,
          status: 'post_accepted',
          post_theme_content: {
            title: generatedContent.title,
            content: generatedContent.content,
            status: 'accepted',
            created_at: generatedContent.created_at
          } // Store the actual generated article here
        })
      });
    } catch (error) {
      console.error('Error updating onboarding analytics:', error);
    }

    // Update status to schedule_shown
    try {
      const website_id = localStorage.getItem('website_id');
      const website_url = localStorage.getItem('onboardingWebsite');
      
      await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/store-onboarding-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          website_id,
          website_url,
          status: 'schedule_shown'
        })
      });
    } catch (error) {
      console.error('Error updating onboarding analytics:', error);
    }

    setState(prev => ({
      ...prev,
      step: 4,
      progress: 0
    }));
    
    // Update URL to reflect current step
    updateUrlParams({ step: 'scheduling' });
  };

  // Handle frequency change
  const handleFrequencyChange = (frequency: number) => {
    setState(prev => ({
      ...prev,
      postingFrequency: frequency,
      // Update default posting days based on frequency
      postingDays: getDefaultPostingDays(frequency)
    }));
  };

  // Get default posting days based on frequency
  const getDefaultPostingDays = (frequency: number): string[] => {
    switch (frequency) {
      case 1:
        return ['monday'];
      case 2:
        return ['monday', 'thursday'];
      case 3:
        return ['monday', 'wednesday', 'friday'];
      case 4:
        return ['monday', 'tuesday', 'thursday', 'friday'];
      case 5:
        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      case 6:
        return ['monday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      case 7:
        return ['monday', 'monday', 'tuesday', 'wednesday', 'thursday', 'thursday', 'friday'];
      case 8:
        return ['monday', 'monday', 'tuesday', 'tuesday', 'wednesday', 'thursday', 'thursday', 'friday'];
      case 9:
        return ['monday', 'monday', 'tuesday', 'tuesday', 'wednesday', 'wednesday', 'thursday', 'thursday', 'friday'];
      case 10:
        return ['monday', 'monday', 'tuesday', 'tuesday', 'wednesday', 'wednesday', 'thursday', 'thursday', 'friday', 'friday'];
      default:
        return ['monday', 'wednesday', 'friday'];
    }
  };

  // Handle posting day toggle
  const handleDayToggle = (day: string) => {
    setState(prev => {
      const newDays = prev.postingDays.includes(day)
        ? prev.postingDays.filter(d => d !== day)
        : [...prev.postingDays, day];
      
      // Ensure we don't exceed the posting frequency
      if (newDays.length > prev.postingFrequency) {
        toast.warning(`You can only select ${prev.postingFrequency} days for your current frequency.`);
        return prev;
      }
      
      return {
        ...prev,
        postingDays: newDays
      };
    });
  };

  // Handle continue to WordPress auth
  const handleContinueToWordPress = () => {
    setState(prev => ({ ...prev, step: 5 })); // Move to WordPress auth
    updateUrlParams({ step: 'auth' });
  };

  // Publish content and complete
  const handlePublishContent = () => {
    setState(prev => ({ ...prev, step: 4 })); // Now goes to scheduling step
    updateUrlParams({ step: 'scheduling' });
  };

  // Add WordPress connection handlers
  const handleSkipWordPress = () => {
    toast.info("Content saved as draft. You can connect WordPress later from the settings.");
    setState(prev => ({ ...prev, step: 5 })); // Go to completion
    
    // Update URL to reflect current step
    updateUrlParams({ step: 'integration' });
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
        toast.success("WordPress connected successfully!");
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
    const userId = localStorage.getItem('pending_user_id');
    if (userId) {
      console.log('Transferring data for user:', userId);
      transferDataToDatabase(userId)
        .then(() => {
          toast.success("Setup Complete! Your account has been created and you're ready to start creating content.");
          navigate('/dashboard');
        })
        .catch(error => {
          console.error('Error transferring data:', error);
          toast.error("Error completing setup: " + (error.message || "Failed to complete setup. Please try again."));
        });
    } else {
      console.error('No user ID found for data transfer');
      toast.error("Setup Error: User ID not found. Please try signing up again.");
    }
  };

  // Handle signup
  const handleSignup = async (email: string, password: string): Promise<void> => {
    try {
      console.log('Starting signup process...');
      
      // Generate organisation ID if not exists
      const organisationId = localStorage.getItem('organisation_id') || uuidv4();
      const websiteUrl = state.websiteUrl;
      const urlWithoutProtocol = websiteUrl.replace(/^https?:\/\//, '');
      const domainParts = urlWithoutProtocol.split('.');
      const organisationName = domainParts.length > 1 ? domainParts[domainParts.length - 2] : urlWithoutProtocol;
      
      // Store organisation info
      const organisationInfo = {
        id: organisationId,
        name: organisationName.charAt(0).toUpperCase() + organisationName.slice(1),
        created_at: new Date().toISOString()
      };
      
      console.log('Storing organisation info:', organisationInfo);
      localStorage.setItem('organisation_id', organisationId);
      localStorage.setItem('organisation_info', JSON.stringify(organisationInfo));
      
      // Also store the full organisation object for the OrganisationContext
      console.log('Storing full organisation data in localStorage for OrganisationContext');
      localStorage.setItem('currentOrganisation', JSON.stringify(organisationInfo));
      
      // Use hardcoded URL for production
      const redirectUrl = 'https://contentgardener.ai/dashboard?onboarding=complete&transfer=true';
      console.log('Using redirect URL:', redirectUrl);
      
      // Sign up with email verification and proper redirect
      const { data: signUpData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            website_url: websiteUrl,
            organisation_name: organisationName,
          },
          emailRedirectTo: redirectUrl
        }
      });
      
      if (signupError) {
        console.error('Signup error:', signupError);
        throw signupError;
      }

      if (!signUpData.user) {
        throw new Error('Failed to create user');
      }

      console.log('User created successfully:', signUpData.user.id);

      // Store signup data
      localStorage.setItem('pending_user_id', signUpData.user.id);
      localStorage.setItem('signup_email', email);

      // Store signup data for later
      localStorage.setItem('pending_signup', JSON.stringify({
        userId: signUpData.user.id,
        email,
        timestamp: new Date().toISOString()
      }));

      // Sign in the user immediately
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        throw signInError;
      }

      if (!signInData.user) {
        throw new Error('Failed to sign in after signup');
      }

      console.log('User signed in successfully:', signInData.user.id);

      // Create organisation first
      console.log('Creating organisation with data:', organisationInfo);

      // First, verify the organisation doesn't already exist
      const { data: existingOrg, error: checkError } = await supabase
        .from('organisations')
        .select('id')
        .eq('id', organisationId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking existing organisation:', checkError);
        throw new Error('Failed to check existing organisation');
      }

      if (!existingOrg) {
        console.log('Organisation does not exist, creating new one...');
        const { error: orgError } = await supabase
          .from('organisations')
          .insert([organisationInfo]);

        if (orgError) {
          console.error('Organisation creation error:', orgError);
          throw new Error('Failed to create organisation');
        }

        // Add a small delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify organisation was created
        const { data: verifyOrg, error: verifyError } = await supabase
          .from('organisations')
          .select('id')
          .eq('id', organisationId)
          .single();

        if (verifyError || !verifyOrg) {
          console.error('Organisation verification error:', verifyError);
          throw new Error('Failed to verify organisation creation');
        }

        console.log('Organisation created and verified successfully');
      } else {
        console.log('Organisation already exists, skipping creation');
      }

      // Double check organisation exists before proceeding
      const { data: finalCheck, error: finalCheckError } = await supabase
        .from('organisations')
        .select('id')
        .eq('id', organisationId)
        .single();

      if (finalCheckError || !finalCheck) {
        console.error('Final organisation check failed:', finalCheckError);
        throw new Error('Organisation not found after creation');
      }

      console.log('Organisation setup complete, proceeding with data transfer');

      // Now transfer data which will create membership and other data
      await transferDataToDatabase(signInData.user.id);
      
      // Update this toast call to use Sonner's format
      toast.success("Welcome to Content Gardener! Your account has been created and you're ready to start creating content.");

      // Add a small delay to ensure data is properly stored before navigation
      setTimeout(() => {
        console.log('Navigating to dashboard after successful signup');
        // Force a reload of the page to ensure the organisation data is properly loaded
        window.location.href = '/dashboard';
      }, 1000);

    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      toast.error("Signup Error: " + errorMessage);
      throw error;
    }
  };

  // Handle Google signup
  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) throw error;
      
      // The OAuth flow will handle the redirect
    } catch (error) {
      console.error('Google signup error:', error);
      throw error;
    }
  };

  // Update handleContinueToAuth to send scheduling settings
  const handleContinueToAuth = async () => {
    // Format posting days to match database structure
    const formattedPostingDays = state.postingDays.reduce<Array<{ day: string; count: number }>>((acc, day) => {
      const existingDay = acc.find(d => d.day === day);
      if (existingDay) {
        existingDay.count += 1;
      } else {
        acc.push({ day, count: 1 });
      }
      return acc;
    }, []);

    // Save publication settings
    const publicationSettings = {
      posting_frequency: state.postingFrequency,
      posting_days: formattedPostingDays,
      website_id: localStorage.getItem('website_id'),
      organisation_id: localStorage.getItem('organisation_id'),
      writing_style: defaultSettings.writingStyle,
      subject_matters: []
    };
    
    localStorage.setItem('publication_settings', JSON.stringify(publicationSettings));

    // Update onboarding analytics with scheduling settings and status
    try {
      const website_id = localStorage.getItem('website_id');
      const website_url = localStorage.getItem('onboardingWebsite');
      
      await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/store-onboarding-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          website_id,
          website_url,
          status: 'schedule_accepted',
          scheduling_settings: publicationSettings
        })
      });
    } catch (error) {
      console.error('Error updating onboarding analytics:', error);
    }

    // Show signup modal
    setState(prev => ({ ...prev, showSignupModal: true }));
  };

  // Add generateNewIdeas function
  const generateNewIdeas = async () => {
    // Implementation of generateNewIdeas
    const postIdeas = JSON.parse(localStorage.getItem('post_ideas') || '[]');
    const newIdeas = postIdeas.map(idea => ({
      ...idea,
      hidden: false,
      liked: false
    }));
    localStorage.setItem('post_ideas', JSON.stringify(newIdeas));
    return newIdeas;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border/10 bg-background/98 backdrop-blur-lg">
        <div className="container mx-auto flex justify-center sm:justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo className="scale-110" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl min-h-[calc(100vh-4rem)]">
        <AnimatePresence>
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
              className="w-full py-4"
            >
              <div className="w-full max-w-3xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        delay: 0.2
                      }}
                    >
                      <Sprout className="w-6 h-6 text-primary" />
                    </motion.div>
                    <motion.h2 
                      className="text-2xl font-semibold"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      Let's grow your content garden
                    </motion.h2>
                  </div>
                  <p className="text-muted-foreground">
                    First, let's connect your website to start growing your content.
                  </p>
                </div>
                
                <div className="mb-8">
                  <Progress 
                    value={state.progress} 
                    className="h-4 mb-2 bg-muted/50 overflow-hidden" 
                    style={{
                      background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.15) 100%)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                  >
                    <div 
                      className="absolute inset-0 opacity-20" 
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50,20 C60,20 70,30 70,40 C70,50 60,60 50,60 C40,60 30,50 30,40 C30,30 40,20 50,20 Z M50,40 C55,40 60,45 60,50 C60,55 55,60 50,60 C45,60 40,55 40,50 C40,45 45,40 50,40 Z' fill='%2310B981'/%3E%3C/svg%3E")`,
                        backgroundSize: '20px 20px',
                        backgroundRepeat: 'repeat'
                      }}
                    />
                  </Progress>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Step {state.currentStepIndex + 1} of {steps.length}</p>
                    <p className="text-sm font-medium">{Math.round(state.progress)}%</p>
                  </div>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-md border max-h-[500px] overflow-y-auto">
                  <div className="space-y-2">
                    {steps.slice(0, state.currentStepIndex + 1).reverse().map((step, index) => {
                      const isCurrentStep = index === 0;
                      const isExpanded = isCurrentStep || expandedSteps[step.id];
                      const stepText = isCurrentStep ? state.currentStepText : stepTexts[step.id] || '';
                      
                      return (
                        <motion.div
                          key={step.id}
                          initial={index === 0 ? { opacity: 0, y: -20, scale: 0.95 } : false}
                          animate={index === 0 ? { opacity: 1, y: 0, scale: 1 } : false}
                          transition={{ 
                            duration: 0.4, 
                            ease: "easeOut"
                          }}
                          layout="position"
                          className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                            isCurrentStep 
                              ? 'bg-primary/5 border border-primary/20 shadow-sm' 
                              : 'bg-background/50 hover:bg-background/80'
                          }`}
                        >
                          <div className="mt-1 flex-shrink-0">
                            {!isCurrentStep ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              >
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                              </motion.div>
                            ) : (
                              <motion.div
                                animate={{ 
                                  scale: [1, 1.1, 1],
                                  rotate: [0, 5, -5, 0]
                                }}
                                transition={{ 
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              >
                                <Sparkles className="w-5 h-5 text-primary" />
                              </motion.div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div 
                              className="flex items-center justify-between cursor-pointer group"
                              onClick={() => !isCurrentStep && toggleStepExpanded(step.id)}
                            >
                              <div className="min-w-0">
                                <motion.p 
                                  className="font-medium truncate"
                                  initial={index === 0 ? { opacity: 0, x: -10 } : false}
                                  animate={index === 0 ? { opacity: 1, x: 0 } : false}
                                  transition={{ duration: 0.3 }}
                                >
                                  {step.name}
                                </motion.p>
                              </div>
                              {!isCurrentStep && (
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex-shrink-0 ml-2"
                                >
                                  <ChevronRight 
                                    className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                                      isExpanded ? 'rotate-90' : ''
                                    }`}
                                  />
                                </motion.div>
                              )}
                            </div>
                            {isCurrentStep && state.currentStepText && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="mt-2 text-sm"
                              >
                                {state.currentStepText.split('\n').map((line, i) => {
                                  if (line.startsWith('/') || line.startsWith('http')) {
                                    return (
                                      <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: i * 0.1 }}
                                        className="flex items-center gap-2 text-primary/80 hover:text-primary transition-colors"
                                      >
                                        <Link className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{line}</span>
                                      </motion.div>
                                    );
                                  }
                                  return (
                                    <motion.p
                                      key={i}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.3, delay: i * 0.1 }}
                                      className={`${i > 0 ? 'mt-1' : ''} break-words`}
                                    >
                                      {line}
                                    </motion.p>
                                  );
                                })}
                              </motion.div>
                            )}
                            {!isCurrentStep && isExpanded && stepText && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-2 text-sm"
                              >
                                {stepText.split('\n').map((line, i) => (
                                  <motion.p
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: i * 0.1 }}
                                    className={`${i > 0 ? 'mt-1' : ''} break-words`}
                                  >
                                    {line}
                                  </motion.p>
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
              className="w-full py-4"
            >
              <div className="w-full mx-auto">
                <h2 className="text-2xl font-semibold mb-6">
                  🌱✨ Choose the best ideas 🪴
                </h2>
                
                <p className="text-muted-foreground mb-8">
                  ✨ Thumbs up your favourite topics so we can generate content based on your website's tone and style.
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
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </motion.div>
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
              className="w-full py-4"
            >
              <div className="w-full mx-auto">
                <motion.div className="text-center space-y-3 mb-8">
                  <motion.h2 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="text-3xl font-bold"
                  >
                    Look what's sprouting! 🌱
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="text-muted-foreground text-lg max-w-xl mx-auto"
                  >
                    Here's your first seedling - a quick draft in your voice. Like any young plant, it might need some pruning and care, but the roots are there! 
                  </motion.p>
                </motion.div>
                
                {!state.contentGenerated ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="text-center mb-8"
                  >
                    <motion.div 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                        delay: 0.4 
                      }}
                      className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
                    >
                      <Wand2 className="h-10 w-10 text-primary animate-pulse" />
                    </motion.div>
                    
                    <motion.h3 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      className="text-xl font-medium mb-2"
                    >
                      🛠️ Generating first draft
                    </motion.h3>
                    
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                      className="text-muted-foreground mb-4"
                    >
                      We're putting your favorite idea into words...
                    </motion.p>
                    
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7, duration: 0.4 }}
                      className="w-full max-w-md mx-auto"
                    >
                      <Progress value={state.progress} className="h-2" />
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.4 }}
                        className="text-sm text-muted-foreground mt-2 whitespace-pre-line text-center"
                      >
                        {state.currentStepText}
                      </motion.p>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                      className="bg-card rounded-lg p-6 border border-border/50"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-medium">{state.generatedContentTitle}</h3>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setState(prev => ({ ...prev, showRawContent: !prev.showRawContent }))}
                              >
                                {state.showRawContent ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{state.showRawContent ? 'Show formatted' : 'Show raw'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        {state.showRawContent ? (
                          <pre className="whitespace-pre-wrap text-sm">{state.generatedContentPreview}</pre>
                        ) : (
                          <div 
                            className="text-sm"
                            dangerouslySetInnerHTML={{ __html: state.generatedContentPreview }}
                          />
                        )}
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                      className="flex justify-end gap-3"
                    >
                      <Button onClick={handleContinueToScheduling}>
                        Continue to Scheduling
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
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
              className="w-full py-4"
            >
              <div className="w-full mx-auto">
                <h2 className="text-2xl font-bold mb-4 text-center">
                  Plan your garden's growth 🌱
                </h2>
                
                <p className="text-muted-foreground text-center mb-8">
                  How often would you like us to help nurture your content garden?
                </p>

                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Publishing Frequency</CardTitle>
                    <CardDescription>How often would you like fresh content for your audience?</CardDescription>
                  </CardHeader>
                  <CardContent>
                <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">1x per week</span>
                        <span className="text-sm font-medium">10x per week</span>
                  </div>
                      <div className="relative">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={state.postingFrequency}
                          onChange={(e) => handleFrequencyChange(parseInt(e.target.value))}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <div className="text-2xl font-semibold">{state.postingFrequency}x</div>
                          <div className="text-sm text-muted-foreground">per week</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {state.postingFrequency === 1 ? 'Perfect for maintaining a steady presence' :
                           state.postingFrequency <= 3 ? 'Ideal for growing your audience consistently' :
                           state.postingFrequency <= 5 ? 'Great for high engagement and SEO impact' :
                           'Maximum impact and authority building'}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground text-center">
                        {state.postingFrequency <= 1 ? 'Hobby Plan for €15/month - Starting with a free trial' :
                         state.postingFrequency <= 3 ? 'Pro Plan - Starting at €49/month - Starting with a free trial' :
                         state.postingFrequency <= 5 ? 'Pro Plan (€49/month) + Article Package (10 articles for €20) - Starting with a free trial' :
                         state.postingFrequency <= 7 ? 'Pro Plan (€49/month) + Article Packages (20 articles for €40) - Starting with a free trial' :
                         'Pro Plan (€49/month) + Article Packages (30 articles for €60) - Starting with a free trial'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Publishing Days</CardTitle>
                    <CardDescription>
                      When would you like to publish your content?
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
                          <div key={day} className="flex flex-col items-center gap-2">
                            <Toggle
                              pressed={state.postingDays.includes(day)}
                              onPressedChange={() => handleDayToggle(day)}
                              className="capitalize w-full text-sm"
                            >
                              {day}
                            </Toggle>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const currentCount = state.postingDays.filter(d => d === day).length;
                                  if (currentCount > 0) {
                                    setState(prev => ({
                                      ...prev,
                                      postingDays: prev.postingDays.filter((d, i) => 
                                        !(d === day && i === prev.postingDays.lastIndexOf(day))
                                      )
                                    }));
                                  }
                                }}
                              >
                                -
                              </Button>
                              <span className="text-sm min-w-[1.5rem] text-center">
                                {state.postingDays.filter(d => d === day).length}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const currentCount = state.postingDays.filter(d => d === day).length;
                                  const totalPosts = state.postingDays.length;
                                  if (totalPosts < state.postingFrequency) {
                                    setState(prev => ({
                                      ...prev,
                                      postingDays: [...prev.postingDays, day]
                                    }));
                                  }
                                }}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    
                      {state.postingDays.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-4">
                          <p className="font-medium">Your publishing schedule:</p>
                          <div className="mt-2 space-y-2">
                            {Array.from(new Set(state.postingDays)).map((day) => {
                              const postsOnDay = state.postingDays.filter(d => d === day).length;
                              return (
                                <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                  <span className="capitalize font-medium min-w-[100px]">{day}:</span>
                                  <div className="flex gap-1">
                                    {Array.from({ length: postsOnDay }).map((_, i) => (
                                      <div
                                        key={i}
                                        className="w-2 h-2 rounded-full bg-primary"
                                      />
                                    ))}
                                  </div>
                                  <span className="sm:ml-2">{postsOnDay} post{postsOnDay !== 1 ? 's' : ''}</span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="mt-3 text-xs">
                            Total: {state.postingDays.length} post{state.postingDays.length !== 1 ? 's' : ''} per week
                          </p>
                        </div>
                      )}
                  </div>
                  </CardContent>
                </Card>
                  
                <div className="flex justify-end gap-4">
                    <Button
                      variant="outline"
                    onClick={() => {
                      setState(prev => ({ ...prev, step: 3 }));
                      updateUrlParams({ step: 'post-draft' });
                    }}
                    >
                    Back
                    </Button>
                    <Button
                    onClick={handleContinueToAuth}
                    disabled={state.postingDays.length !== state.postingFrequency}
                  >
                    Continue to Setup <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
              </div>
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
              className="w-full py-4"
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

          {/* Completion - Now step 6 */}
          {state.step === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.5,
                ease: "easeInOut",
                opacity: { duration: 0.3 }
              }}
              className="w-full py-4"
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
                {state.step === 6 ? 
                  "Your content is ready and WordPress is connected. Let's start creating!" :
                  "Your content is saved and ready. You can connect WordPress anytime from settings."}
              </p>
              
              <Button onClick={handleComplete} size="lg" className="px-8">
                Go to Dashboard <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}
          
          {/* Add SignupModal */}
          <SignupModal
            isOpen={state.showSignupModal}
            onClose={() => setState(prev => ({ ...prev, showSignupModal: false }))}
            onSignup={handleSignup}
            onGoogleSignup={handleGoogleSignup}
          />

          {/* Add new Email Verification step */}
          {state.step === 'email-verification' && (
            <motion.div
              key="email-verification"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.5,
                ease: "easeInOut",
                opacity: { duration: 0.3 }
              }}
              className="w-full py-4"
            >
              <div className="w-full mx-auto">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Mail className="h-10 w-10 text-primary" />
                </div>
                
                <h2 className="text-2xl font-bold mb-4">
                  Check your email
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  We've sent a verification link to:<br />
                  <span className="font-medium text-foreground">{state.verificationEmail}</span>
                </p>
                
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Click the link in your email to verify your account and access your dashboard.
                  </p>
                  
                  <div className="bg-muted/50 rounded-lg p-4 text-sm">
                    <p className="font-medium mb-2">Can't find the email?</p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Check your spam folder</li>
                      <li>• Make sure the email address is correct</li>
                      <li>• Allow a few minutes for the email to arrive</li>
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={() => navigate('/auth')} 
                      variant="default" 
                      className="w-full"
                    >
                      Continue to Login
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Onboarding; 