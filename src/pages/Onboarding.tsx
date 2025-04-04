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
  Wand2
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/context/OrganisationContext";
import { 
  hasAnonymousUser, 
  getAnonymousUser, 
  initAnonymousUser,
  completeAnonymousUserSetup 
} from "@/utils/anonymousUser";

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
  websiteId: string | null;
  onboardingId: string | null;
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
    name: "Deep Website Analysis", 
    description: "Analyzing your website structure and content",
    detail: "Extracting data from your pages to understand your unique tone and style",
    duration: 3000,
    substeps: [
      "Fetching sitemap.xml and content pages",
      "Analyzing writing style and structure",
      "Identifying your unique brand voice"
    ]
  },
  { 
    id: 2, 
    name: "Content Fingerprinting", 
    description: "Creating your site's content fingerprint",
    detail: "Building a profile of your site's unique content patterns and style preferences",
    duration: 2500,
    substeps: [
      "Extracting topic clusters",
      "Mapping content relationships",
      "Building your site's writing style profile"
    ]
  },
  { 
    id: 3, 
    name: "Content Opportunity Analysis", 
    description: "Finding content gaps",
    detail: "Discovering what topics your audience wants that your site doesn't yet cover",
    duration: 2000,
    substeps: [
      "Analyzing competitor content gaps",
      "Identifying keyword opportunities",
      "Mapping reader interest patterns"
    ]
  },
  { 
    id: 4, 
    name: "Content Strategy Creation", 
    description: "Building your personalized content plan",
    detail: "Creating a tailored content calendar based on your site's unique fingerprint",
    duration: 2500,
    substeps: [
      "Generating topic clusters",
      "Creating content outlines",
      "Building publishing schedules"
    ]
  },
  { 
    id: 5, 
    name: "WordPress Integration", 
    description: "Connecting your WordPress site",
    detail: "Setting up seamless publishing of content that matches your site perfectly",
    duration: 2000,
    substeps: [
      "Configuring WordPress connection",
      "Mapping content categories",
      "Setting up publishing workflows"
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

const Onboarding = () => {
  const [state, setState] = useState<OnboardingState>({
    step: 0,
    websiteUrl: localStorage.getItem('onboardingWebsite') || '',
    progress: 0,
    currentStepIndex: 0,
    currentStepText: '',
    selectedType: null,
    websiteId: localStorage.getItem('currentWebsiteId') || null,
    onboardingId: null,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { completeNewUserSetup } = useOrganisation();
  const [initializing, setInitializing] = useState(true);
  
  useEffect(() => {
    console.log("Onboarding mounted, websiteUrl:", state.websiteUrl);
    
    // Initialize anonymous user if not already initialized
    if (!hasAnonymousUser()) {
      console.log("No anonymous user found, initializing...");
      initAnonymousUser();
    } else {
      console.log("Anonymous user exists:", getAnonymousUser());
    }
    
    initializeOnboarding();
  }, []);

  const initializeOnboarding = async () => {
    // If we already have a website ID, we've completed the website creation part
    if (state.websiteId) {
      console.log("Website ID already exists, fetching onboarding status");
      await fetchOnboardingStatus();
      setInitializing(false);
      
      // Skip to analysis step
      if (state.step === 0) {
        setTimeout(() => {
          handleNextStep();
        }, 500);
      }
      return;
    }
    
    // If we have a website URL from the landing page but no website ID yet
    if (state.websiteUrl && !state.websiteId) {
      try {
        console.log("Creating website and organization with URL:", state.websiteUrl);
        
        // Show toast to indicate setup is in progress
        toast({
          title: "Setting up your account",
          description: "Creating your organization and website...",
        });
        
        // Use our anonymous user setup to create resources in localStorage
        const setupResult = completeAnonymousUserSetup(state.websiteUrl);
        
        if (setupResult) {
          console.log("Anonymous user setup completed successfully:", setupResult);
          
          // Update state with website ID
          setState(prev => ({
            ...prev,
            websiteId: setupResult.websiteId,
            onboardingId: setupResult.onboardingId
          }));
          
          console.log("State updated with websiteId and onboardingId");
          setInitializing(false);
          
          // Move to analysis step
          console.log("Moving to analysis step");
          handleNextStep();
        } else {
          console.error("Failed to create website and organization");
          setInitializing(false);
          
          // If we can't create the website, fall back to manual URL entry
          toast({
            title: "Setup failed",
            description: "Please try entering your website URL again",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error during setup:", error);
        console.log("Error details:", JSON.stringify(error, null, 2));
        setInitializing(false);
        
        toast({
          title: "Setup failed",
          description: "Please try entering your website URL again",
          variant: "destructive"
        });
      }
    } else {
      // No website URL or ID, just show the form
      console.log("No website URL or ID found", { websiteUrl: state.websiteUrl, websiteId: state.websiteId });
      setInitializing(false);
    }
  };

  const fetchOnboardingStatus = async () => {
    try {
      console.log('Fetching onboarding status for website ID:', state.websiteId);
      
      // Get status from localStorage instead of database
      const anonymousUser = getAnonymousUser();
      if (anonymousUser && anonymousUser.onboarding) {
        console.log('Onboarding status found:', anonymousUser.onboarding);
        setState(prev => ({
          ...prev,
          onboardingId: anonymousUser.onboarding?.id || null
        }));
        
        // If we're at a particular stage in the onboarding process,
        // adjust the UI accordingly
        if (anonymousUser.onboarding.website_indexing && !anonymousUser.onboarding.keyword_suggestions) {
          // Website indexing is done but not keywords yet
          console.log('Website indexing is complete, moving to keywords stage');
        } else if (anonymousUser.onboarding.keyword_suggestions && !anonymousUser.onboarding.post_ideas) {
          // Keywords done but not post ideas
          console.log('Keyword suggestions complete, moving to post ideas stage');
        } else if (anonymousUser.onboarding.post_ideas) {
          // Post ideas generated
          console.log('Post ideas generated, moving to feedback stage');
        }
      }
    } catch (err) {
      console.error('Error in fetchOnboardingStatus:', err);
    }
  };

  const updateOnboardingStatus = async (status: string, updates: Record<string, any> = {}) => {
    try {
      console.log(`Updating onboarding status to ${status} with updates:`, updates);
      
      // Update in localStorage instead of database
      const anonymousUser = getAnonymousUser();
      if (anonymousUser && anonymousUser.onboarding) {
        anonymousUser.onboarding = {
          ...anonymousUser.onboarding,
          status,
          ...updates
        };
        
        localStorage.setItem('anonymous_user', JSON.stringify(anonymousUser));
        console.log('Onboarding status updated successfully:', anonymousUser.onboarding);
      }
    } catch (err) {
      console.error('Error in updateOnboardingStatus:', err);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleUrlSubmit called with URL:", state.websiteUrl);
    
    if (!state.websiteUrl) {
      console.log("URL is empty, showing error toast");
      toast({
        title: "URL Required",
        description: "Please enter your website URL",
        variant: "destructive"
      });
      return;
    }
    
    // Format URL if needed
    let formattedUrl = state.websiteUrl;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      console.log("Adding https:// to URL:", formattedUrl);
      formattedUrl = 'https://' + formattedUrl;
      setState(prev => ({ ...prev, websiteUrl: formattedUrl }));
    }
    
    console.log("Saving formatted URL to localStorage:", formattedUrl);
    localStorage.setItem('onboardingWebsite', formattedUrl);
    
    // Initialize website creation
    console.log("Setting initializing to true");
    setInitializing(true);
    
    // Create website and organization
    console.log("Manual path: Calling completeNewUserSetup with URL:", formattedUrl);
    completeNewUserSetup(formattedUrl)
      .then(success => {
        console.log("completeNewUserSetup returned:", success);
        
        if (success) {
          // Get the website ID from localStorage (set by completeNewUserSetup)
          const websiteId = localStorage.getItem('currentWebsiteId');
          console.log("Website created successfully, ID from localStorage:", websiteId);
          
          // Update state with website ID
          setState(prev => ({
            ...prev,
            websiteId: websiteId
          }));
          console.log("State updated with websiteId:", websiteId);
          
          // Fetch onboarding status and move to next step
          console.log("Fetching onboarding status after website creation");
          fetchOnboardingStatus().then(() => {
            console.log("Onboarding status fetched, setting initializing to false");
            setInitializing(false);
            console.log("Moving to next step");
            handleNextStep();
          });
        } else {
          console.error("Manual path: Failed to create website and organization, completeNewUserSetup returned false");
          console.log("Current auth state:", supabase.auth.getSession());
          setInitializing(false);
          
          toast({
            title: "Setup failed",
            description: "Please try again",
            variant: "destructive"
          });
        }
      })
      .catch(error => {
        console.error("Manual path: Error during setup:", error);
        console.log("Error details:", JSON.stringify(error, null, 2));
        console.log("Current auth state:", supabase.auth.getSession());
        setInitializing(false);
        
        toast({
          title: "Setup failed",
          description: "Please try again",
          variant: "destructive"
        });
      });
  };

  const handleNextStep = () => {
    console.log("Moving to next step from:", state.step);
    const nextStep = state.step + 1;
    setState({ ...state, step: nextStep });
    
    if (nextStep === 1) {
      startAnalysis();
    }
  };

  const startAnalysis = () => {
    console.log("Starting analysis...");
    setState({ 
      ...state, 
      progress: 0,
      currentStepIndex: 0,
      currentStepText: contentSteps[0].substeps?.[0] || ''
    });
    
    // Update onboarding status to indexing
    updateOnboardingStatus('indexing');
    
    let currentStep = 0;
    let substepIndex = 0;
    
    const runStep = () => {
      if (currentStep >= contentSteps.length) {
        console.log("Analysis completed");
        return;
      }
      
      const step = contentSteps[currentStep];
      const substeps = step.substeps || [];
      
      setState(prevState => ({
        ...prevState,
        progress: (currentStep / contentSteps.length) * 100,
        currentStepIndex: currentStep,
        currentStepText: substeps[substepIndex] || step.description
      }));
      
      substepIndex++;
      
      if (substepIndex >= substeps.length) {
        substepIndex = 0;
        currentStep++;
        
        if (currentStep < contentSteps.length) {
          setTimeout(runStep, 500);
        } else {
          // Analysis complete, move to content type selection
          setTimeout(() => {
            console.log("Moving to content type selection");
            setState(prevState => ({
              ...prevState,
              progress: 100,
              step: prevState.step + 1
            }));
          }, 1000);
        }
      } else {
        setTimeout(runStep, step.duration / substeps.length);
      }
    };
    
    // Start the first step after a short delay
    setTimeout(runStep, 500);
  };

  const selectContentType = (type: string) => {
    console.log("Selected content type:", type);
    setState({
      ...state,
      selectedType: type
    });
  };

  const handleContentTypeNext = () => {
    if (!state.selectedType) {
      toast({
        title: "Select content type",
        description: "Please select at least one content type to continue",
        variant: "destructive"
      });
      return;
    }
    
    console.log("Moving to content processing step");
    setState({
      ...state,
      step: state.step + 1
    });
    
    // Update onboarding status to generating ideas
    updateOnboardingStatus('generating_ideas');
    
    // Start the content processing step
    setTimeout(() => {
      startContentProcessing();
    }, 500);
  };
  
  const startContentProcessing = () => {
    console.log("Starting content processing");
    setState({ 
      ...state, 
      progress: 0 
    });
    
    // Simulate processing
    const interval = setInterval(() => {
      setState(prevState => {
        const newProgress = prevState.progress + 1;
        
        if (newProgress >= 100) {
          console.log("Content processing completed");
          clearInterval(interval);
          
          // Move to final step after completion
          setTimeout(() => {
            setState(prevState => ({
              ...prevState,
              step: prevState.step + 1
            }));
          }, 500);
          
          return { ...prevState, progress: 100 };
        }
        
        return { ...prevState, progress: newProgress };
      });
    }, 50);
  };
  
  const handleComplete = () => {
    console.log("Setup complete, navigating to dashboard");
    
    // Update onboarding status to completed
    updateOnboardingStatus('completed', {
      website_indexing: true,
      website_indexing_completed_at: new Date().toISOString(),
      keyword_suggestions: true,
      keyword_suggestions_completed_at: new Date().toISOString(),
      post_ideas: true,
      post_ideas_completed_at: new Date().toISOString()
    });
    
    toast({
      title: "Setup Complete!",
      description: "You're ready to start creating content for your website."
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
        {initializing ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-8">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-center">Setting up your account</h2>
            <p className="text-muted-foreground text-center max-w-md">
              We're creating your organization and website. This will only take a moment...
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Step 0: Enter Website URL (if not already provided) */}
            {Number(state.step) === 0 && !state.websiteUrl && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center min-h-[70vh]"
              >
                <LogoAnimation />
                
                <h1 className="text-3xl md:text-4xl font-bold mt-8 mb-4 text-center">
                  Let's understand your website's DNA
                </h1>
                
                <p className="text-lg text-muted-foreground max-w-md text-center mb-8">
                  Enter your website URL to begin. We'll analyze your content, style, and audience to create perfectly matched content.
                </p>
                
                <form onSubmit={handleUrlSubmit} className="w-full max-w-md">
                  <div className="flex flex-col gap-4">
                    <Input
                      type="text"
                      placeholder="yourdomain.com"
                      className="h-12 text-lg"
                      value={state.websiteUrl}
                      onChange={(e) => setState({ ...state, websiteUrl: e.target.value })}
                      required
                    />
                    
                    <Button type="submit" size="lg" className="w-full">
                      Analyze My Website <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 1: Website Analysis */}
            {Number(state.step) === 1 && (
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
                    Analyzing <span className="text-primary">{state.websiteUrl}</span> content fingerprint
                  </h2>
                  
                  <div className="mb-8">
                    <Progress value={state.progress} className="h-2 mb-2" />
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Step {state.currentStepIndex + 1} of {contentSteps.length}</p>
                      <p className="text-sm font-medium">{Math.round(state.progress)}%</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-6 mb-8 bg-card">
                    <h3 className="text-lg font-medium mb-4">
                      {contentSteps[state.currentStepIndex]?.name}
                    </h3>
                    
                    <p className="text-muted-foreground mb-6">
                      {contentSteps[state.currentStepIndex]?.detail}
                    </p>
                    
                    <div className="bg-muted/50 p-4 rounded-md border">
                      <div className="flex items-center">
                        <Sparkles className="w-5 h-5 text-primary mr-3 animate-pulse" />
                        <p className="font-medium">{state.currentStepText}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Content Type Selection */}
            {Number(state.step) === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="py-8"
              >
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold mb-2">Your website's content profile is ready</h2>
                  <p className="text-muted-foreground">
                    We've analyzed your site's unique content characteristics:
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                  <div className="border rounded-lg p-6 bg-card">
                    <h3 className="text-lg font-medium mb-4">Website Style Analysis</h3>
                    
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <span className="font-medium w-1/3">Writing Style:</span>
                        <span className="text-muted-foreground">{siteAnalysis.writingStyle}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-medium w-1/3">Target Audience:</span>
                        <span className="text-muted-foreground">{siteAnalysis.targetAudience}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-medium w-1/3">Tone of Voice:</span>
                        <span className="text-muted-foreground">{siteAnalysis.toneOfVoice}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-medium w-1/3">Language:</span>
                        <span className="text-muted-foreground">{siteAnalysis.language}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-6 bg-card">
                    <h3 className="text-lg font-medium mb-4">Content Opportunities</h3>
                    
                    <div className="space-y-4">
                      {keywordOpportunities.slice(0, 2).map((opportunity, i) => (
                        <div key={i} className="border rounded p-3 bg-muted/30">
                          <h4 className="font-medium text-sm mb-1 text-primary">
                            {opportunity.keyword}
                          </h4>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{opportunity.searchVolume}</span>
                            <span>Difficulty: {opportunity.difficulty}</span>
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground mt-2">
                        And {keywordOpportunities.length - 2} more opportunities...
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-8">
                  <h3 className="text-xl font-medium mb-4">Select content formats that match your site</h3>
                  <p className="text-muted-foreground mb-6">
                    Based on your website's content fingerprint, we recommend these formats:
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {contentTypes.map((type) => (
                      <div
                        key={type.id}
                        className={`border rounded-lg p-5 cursor-pointer transition-all ${
                          state.selectedType === type.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:border-border/60'
                        }`}
                        onClick={() => selectContentType(type.id)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {type.icon}
                          </div>
                          {state.selectedType === type.id && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        
                        <h4 className="font-medium mb-1">{type.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{type.description}</p>
                        
                        {type.recommended && (
                          <div className="text-xs font-medium text-primary bg-primary/10 py-1 px-2 rounded inline-block">
                            {type.recommended}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={handleContentTypeNext}
                    size="lg"
                    className="w-full md:w-auto"
                  >
                    Continue <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Content Processing & Setup */}
            {Number(state.step) === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center min-h-[70vh]"
              >
                <div className="w-full max-w-2xl text-center">
                  <div className="mb-8">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                      <Wand2 className="h-10 w-10 text-primary animate-pulse" />
                    </div>
                    
                    <h2 className="text-2xl font-bold mb-2">
                      Crafting your site-specific content
                    </h2>
                    <p className="text-muted-foreground">
                      We're building content that will feel like a natural extension of your site
                    </p>
                  </div>
                  
                  <div className="mb-10">
                    <Progress value={state.progress} className="h-3 mb-3" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Creating content that matches your site's voice</span>
                      <span>{Math.round(state.progress)}%</span>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-6 bg-muted/30 mb-6 text-left">
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <Clock className="mr-2 h-5 w-5 text-primary" />
                      What's happening now
                    </h3>
                    
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                        <span className="text-sm">Analyzing your content structure and patterns</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                        <span className="text-sm">Identifying your website's unique tone and style</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                        <span className="text-sm">Building content that matches your site perfectly</span>
                      </li>
                      <li className="flex items-center opacity-50">
                        <div className="h-4 w-4 border-2 border-primary/40 border-t-transparent rounded-full animate-spin mr-2 flex-shrink-0"></div>
                        <span className="text-sm">Creating a personalized content strategy blueprint</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Complete */}
            {Number(state.step) === 4 && (
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
        )}
      </main>
    </div>
  );
};

export default Onboarding; 