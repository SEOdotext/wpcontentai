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
  Search, 
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

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
    name: "Website Analysis", 
    description: "Analyzing your website structure",
    detail: "Extracting data from sitemap.xml, homepage HTML, and visible text",
    duration: 3000,
    substeps: [
      "Fetching sitemap.xml",
      "Analyzing HTML structure",
      "Processing visible content"
    ]
  },
  { 
    id: 2, 
    name: "Understanding Your Content", 
    description: "Learning your website",
    detail: "Reading content and understanding your tone of voice",
    duration: 2500,
    substeps: [
      "Learning website structure",
      "Reading your content",
      "Understanding your tone of voice"
    ]
  },
  { 
    id: 3, 
    name: "Select Content Type", 
    description: "Choose your format",
    detail: "Selecting the best format based on your content",
    duration: 2000,
    substeps: [
      "Analyzing content types",
      "Determining best format",
      "Preparing recommendations"
    ]
  },
  { 
    id: 4, 
    name: "Content Processing", 
    description: "Research and planning",
    detail: "Conducting SEO keyword research and prioritizing content",
    duration: 2500,
    substeps: [
      "Conducting SEO keyword research",
      "Prioritizing content topics",
      "Creating content strategy"
    ]
  },
  { 
    id: 5, 
    name: "Setup Complete", 
    description: "Ready to create content",
    detail: "Your WordPress site is now connected and ready for AI content",
    duration: 2000,
    substeps: [
      "Connecting to WordPress",
      "Setting up publishing schedule",
      "Preparing initial content ideas"
    ]
  }
];

// Sample data for website analysis
const siteAnalysis = {
  writingStyle: "Friendly and easy to understand",
  targetAudience: "Everyone who uses computers",
  toneOfVoice: "Warm and helpful, like talking to a friend",
  contentTypes: ["Pages about what you do", "Helpful tips and stories", "Success stories"],
  language: "Simple English",
  keyPhrases: ["easy solutions", "helpful guidance", "proven results"]
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

// Basic validation for website URL
const isValidUrl = (url: string) => {
  try {
    // Make sure it starts with http:// or https://
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

const Onboarding = () => {
  const [state, setState] = useState<OnboardingState>({
    step: 0,
    websiteUrl: localStorage.getItem('onboardingWebsite') || '',
    progress: 0,
    currentStepIndex: 0,
    currentStepText: '',
    selectedType: null,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    // If we have a website URL already stored, move to step 1
    if (state.websiteUrl && state.step === 0) {
      setTimeout(() => {
        handleNextStep();
      }, 500);
    }
  }, []);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl(state.websiteUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website URL",
        variant: "destructive"
      });
      return;
    }
    
    localStorage.setItem('onboardingWebsite', state.websiteUrl);
    handleNextStep();
  };

  const handleNextStep = () => {
    const nextStep = state.step + 1;
    setState({ ...state, step: nextStep });
    
    if (nextStep === 1) {
      startAnalysis();
    }
  };

  const startAnalysis = () => {
    setState({ 
      ...state, 
      progress: 0,
      currentStepIndex: 0,
      currentStepText: contentSteps[0].substeps?.[0] || ''
    });
    
    let currentStep = 0;
    let substepIndex = 0;
    
    const runStep = () => {
      if (currentStep >= contentSteps.length) {
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
            setState(prevState => ({
              ...prevState,
              progress: 100,
              step: state.step + 1
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
    
    setState({
      ...state,
      step: state.step + 1
    });
    
    // Start the content processing step
    setTimeout(() => {
      startContentProcessing();
    }, 500);
  };
  
  const startContentProcessing = () => {
    setState({ 
      ...state, 
      progress: 0 
    });
    
    // Simulate processing
    const interval = setInterval(() => {
      setState(prevState => {
        const newProgress = prevState.progress + 1;
        
        if (newProgress >= 100) {
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
        <AnimatePresence mode="wait">
          {/* Step 0: Enter Website URL (if not already provided) */}
          {state.step === 0 && (
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
                Let's set up your content garden
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-md text-center mb-8">
                Enter your website URL to get started. We'll analyze your site and prepare everything for you.
              </p>
              
              <form onSubmit={handleUrlSubmit} className="w-full max-w-md">
                <div className="flex flex-col gap-4">
                  <Input
                    type="url"
                    placeholder="https://yourwebsite.com"
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
                  Analyzing <span className="text-primary">{state.websiteUrl}</span>
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
          {state.step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="py-8"
            >
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Your website analysis is complete</h2>
                <p className="text-muted-foreground">
                  Based on our analysis, here's what we found about your website:
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
                <h3 className="text-xl font-medium mb-4">Select content type to create</h3>
                <p className="text-muted-foreground mb-6">
                  Based on your website, we recommend these content types:
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
          {state.step === 3 && (
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
                    <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-2">
                    Setting up your content strategy
                  </h2>
                  <p className="text-muted-foreground">
                    We're finalizing your content plan and preparing your dashboard
                  </p>
                </div>
                
                <div className="mb-10">
                  <Progress value={state.progress} className="h-3 mb-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Creating your content strategy</span>
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
                      <span className="text-sm">Analyzing your existing content</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                      <span className="text-sm">Identifying content gaps and opportunities</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                      <span className="text-sm">Setting up WordPress integration</span>
                    </li>
                    <li className="flex items-center opacity-50">
                      <div className="h-4 w-4 border-2 border-primary/40 border-t-transparent rounded-full animate-spin mr-2 flex-shrink-0"></div>
                      <span className="text-sm">Creating your personalized content calendar</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Complete */}
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
                Your website is connected and your content strategy is ready. Let's start creating amazing content.
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