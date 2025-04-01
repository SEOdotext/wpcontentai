import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowRight, 
  FileText, 
  Layout, 
  BookOpen, 
  Newspaper, 
  Calendar,
  Search, 
  Book, 
  Send, 
  Wand2, 
  Plus, 
  CheckCircle2,
  Clock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

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

interface GeneratedContent {
  title: string;
  content: string;
  summary: string;
  keywords: string[];
  estimatedReadTime: string;
}

interface FuturePost {
  title: string;
  type: string;
  scheduledFor: Date;
  estimatedReach: string;
  keywords: string[];
  status: 'draft' | 'scheduled';
  description: string;
}

// Component state type
interface IndexState {
  step: number;
  url: string;
  progress: number;
  currentStepIndex: number;
  currentStepText: string;
  selectedType: string | null;
  generatedContent: GeneratedContent | null;
}

const contentTypes = [
  {
    id: 'blog',
    name: 'Blog Post',
    description: 'Your friendly, easy-to-understand style perfect for educating your audience.',
    icon: <FileText className="w-5 h-5 text-primary" />,
    recommended: "Recommended for SEO 🔍"
  },
  {
    id: 'guide',
    name: 'How-to Guide',
    description: 'Step-by-step guidance in your helpful, clear format.',
    icon: <BookOpen className="w-5 h-5 text-primary" />,
    recommended: "Great for User Experience 🎯"
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Convert visitors with your proven simple solutions approach.',
    icon: <Layout className="w-5 h-5 text-primary" />,
    recommended: "Best for Conversions 💎"
  }
];

const contentSteps = [
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
      "Writing your first content"
    ]
  },
  { 
    id: 5, 
    name: "Content Generation", 
    description: "Creating your content",
    detail: "Writing your post and planning future content",
    duration: 2000,
    substeps: [
      "Generating main content",
      "Creating future post schedule",
      "Finalizing drafts"
    ]
  }
];

const siteAnalysis = {
  writingStyle: "Friendly and easy to understand",
  targetAudience: "Everyone who uses computers",
  toneOfVoice: "Warm and helpful, like talking to a friend",
  contentTypes: ["Pages about what you do", "Helpful tips and stories", "Success stories"],
  language: "Simple English",
  keyPhrases: ["easy solutions", "helpful guidance", "proven results"]
};

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

const LogoIcon = () => (
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

const AnimatedText = ({ text, gradient }: { text: string, gradient?: boolean }) => {
  return (
    <span className="relative inline-block">
      <span className="absolute top-0 left-0 w-full h-full flex items-center">
        <span className="opacity-0">Content</span>
        <span className="opacity-0">Gardener</span>
        <span className="opacity-0">ai</span>
      </span>
      <span className="flex">
        <motion.span
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.1, delay: 1.2, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="text-foreground/80"
        >
          Content
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1, delay: 1.25, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          Gardener
        </motion.span>
        <motion.span
          initial={{ opacity: 0, x: 5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.1, delay: 1.3, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="text-foreground/80"
        >
          ai
        </motion.span>
      </span>
    </span>
  );
};

const isValidDomain = (url: string) => {
  const pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  return pattern.test(url);
};

const futurePosts = [
  {
    title: "10 Essential Tips for Better Website Performance",
    type: "Blog Post",
    scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
    estimatedReach: "3,200-4,500 visitors",
    keywords: ["website performance", "optimization", "speed"],
    status: 'scheduled',
    description: "A comprehensive guide to improving your website's loading speed and performance."
  },
  {
    title: "The Complete Guide to SEO in 2024",
    type: "Guide",
    scheduledFor: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Two weeks
    estimatedReach: "5,000-7,000 visitors",
    keywords: ["SEO", "search optimization", "2024 trends"],
    status: 'draft',
    description: "Up-to-date strategies and techniques for improving your search engine rankings."
  },
  // Add 8 more posts with varied dates and topics
  {
    title: "Building Trust Through Content Marketing",
    type: "Blog Post",
    scheduledFor: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    estimatedReach: "2,800-3,500 visitors",
    keywords: ["content marketing", "brand trust", "audience engagement"],
    status: 'draft',
    description: "Learn how to build lasting relationships with your audience through strategic content."
  },
  {
    title: "Mobile-First Design: A Practical Approach",
    type: "Guide",
    scheduledFor: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    estimatedReach: "4,200-5,500 visitors",
    keywords: ["mobile design", "responsive", "UX"],
    status: 'scheduled',
    description: "Step-by-step guide to implementing mobile-first design principles."
  },
  {
    title: "Mastering Social Media Integration",
    type: "Blog Post",
    scheduledFor: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    estimatedReach: "3,500-4,800 visitors",
    keywords: ["social media", "integration", "marketing"],
    status: 'draft',
    description: "Strategies for seamlessly integrating social media into your website."
  },
  {
    title: "E-commerce Optimization Techniques",
    type: "Guide",
    scheduledFor: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
    estimatedReach: "6,000-8,000 visitors",
    keywords: ["e-commerce", "conversion", "optimization"],
    status: 'scheduled',
    description: "Advanced techniques for improving your online store's performance."
  },
  {
    title: "Content Accessibility Best Practices",
    type: "Blog Post",
    scheduledFor: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000),
    estimatedReach: "2,500-3,200 visitors",
    keywords: ["accessibility", "inclusive design", "WCAG"],
    status: 'draft',
    description: "Making your content accessible to all users through proven practices."
  },
  {
    title: "Advanced SEO Link Building Strategies",
    type: "Guide",
    scheduledFor: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000),
    estimatedReach: "4,800-6,200 visitors",
    keywords: ["link building", "SEO", "backlinks"],
    status: 'scheduled',
    description: "Modern approaches to building high-quality backlinks for better SEO."
  },
  {
    title: "Website Security Fundamentals",
    type: "Blog Post",
    scheduledFor: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000),
    estimatedReach: "3,800-5,000 visitors",
    keywords: ["security", "protection", "cybersecurity"],
    status: 'draft',
    description: "Essential security measures every website owner should implement."
  },
  {
    title: "Data-Driven Content Strategy",
    type: "Guide",
    scheduledFor: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
    estimatedReach: "5,500-7,200 visitors",
    keywords: ["analytics", "content strategy", "data"],
    status: 'scheduled',
    description: "Using data analytics to inform and improve your content strategy."
  }
];

const Index = () => {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentStepText, setCurrentStepText] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['blog', 'guide', 'landing']));
  const [selectedPosts, setSelectedPosts] = useState<{ [key: number]: boolean }>(() => {
    // Initialize all posts as selected
    const initialState: { [key: number]: boolean } = {};
    futurePosts.forEach((_, index) => {
      initialState[index] = true;
    });
    return initialState;
  });
  const [isEditingObservations, setIsEditingObservations] = useState(false);
  const [observations, setObservations] = useState([
    "Keep things simple and easy to follow",
    "Chat like you're talking to a friend",
    "Make tech stuff clear for everyone"
  ]);
  const { toast } = useToast();

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
    startAnalysis();
  };

  const startAnalysis = () => {
    setProgress(0);
    setCurrentStepText("Starting analysis...");
    
    const steps = [
      { text: "Fetching sitemap.xml", progress: 33 },
      { text: "Analyzing HTML structure", progress: 66 },
      { text: "Processing visible content", progress: 100 }
    ];
    
    let currentStep = 0;
    
    const runStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setCurrentStepText(step.text);
        setProgress(step.progress);
        currentStep++;
        setTimeout(runStep, 1000);
      } else {
        setCurrentStepText("Analysis complete");
        setTimeout(() => setStep(3), 500);
      }
    };
    
    runStep();
  };

  const handleNextStep = () => {
    if (step < 5) {
      setStep(step + 1);
      if (step + 1 === 4) {
        // Start content processing
        startContentProcessing();
      }
    }
  };

  const selectContentType = (type: string) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const handleContentTypeNext = () => {
    // Use the first selected type for content generation (can be enhanced to handle multiple types)
    const firstType = Array.from(selectedTypes)[0];
    setSelectedType(firstType);
    setGeneratedContent({
      title: firstType === 'blog' 
        ? '10 Essential Tips for Better Website Performance'
        : 'Your Landing Page Title',
      content: `# ${firstType === 'blog' ? '10 Essential Tips for Better Website Performance' : 'Your Landing Page Title'}

## Introduction

In today's digital landscape, website performance is crucial for success. A fast, responsive website not only provides a better user experience but also improves your search engine rankings and conversion rates.

## The Impact of Website Performance

Studies show that:
- 47% of users expect a web page to load in 2 seconds or less
- 40% abandon a website that takes more than 3 seconds to load
- A 1-second delay in page response can result in a 7% reduction in conversions

## Essential Tips for Improvement

### 1. Optimize Images
One of the most effective ways to improve your website's performance is through proper image optimization:
- Use appropriate image formats (JPEG for photographs, PNG for graphics)
- Implement lazy loading for images
- Utilize modern image formats like WebP with fallbacks

### 2. Leverage Browser Caching
Implementing browser caching can significantly improve load times for returning visitors:
- Set appropriate cache headers
- Use versioning for static assets
- Implement service workers for offline capabilities

### 3. Minify and Compress Resources
Reduce file sizes to improve loading speed:
- Minify CSS, JavaScript, and HTML
- Enable GZIP compression
- Use modern compression algorithms like Brotli

## Implementation Guide

Follow these steps to implement the improvements:
1. Audit your current performance
2. Prioritize high-impact changes
3. Implement improvements incrementally
4. Monitor and measure results

## Conclusion

By following these tips, you can significantly improve your website's performance and user experience. Remember to regularly monitor your metrics and make adjustments as needed.`,
      summary: "A comprehensive guide to improving website performance through proven optimization techniques.",
      keywords: ["website performance", "optimization", "page speed", "user experience"],
      estimatedReadTime: "5 minutes"
    });
    handleNextStep();
  };

  const startContentProcessing = () => {
    const steps = [
      { text: "Conducting SEO keyword research", progress: 33 },
      { text: "Prioritizing content topics", progress: 66 },
      { text: "Writing your first content", progress: 100 }
    ];
    
    let currentStep = 0;
    
    const runStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setCurrentStepText(step.text);
        setProgress(step.progress);
        currentStep++;
        setTimeout(runStep, 1000);
      } else {
        setCurrentStepText("Content processing complete");
        setTimeout(() => setStep(5), 500);
      }
    };
    
    runStep();
  };

  const togglePostSelection = (index: number) => {
    setSelectedPosts(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex flex-col items-center justify-center p-4 gap-4">
      <Card className={`${step === 5 ? 'w-full max-w-6xl' : 'w-full max-w-2xl'} backdrop-blur-sm bg-background/95 p-8 shadow-xl border border-border/50 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="space-y-2 text-center">
              <motion.div 
                className="flex items-center justify-center gap-2 mb-4"
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <LogoIcon />
              </motion.div>
              <h1 className="text-4xl font-bold tracking-tight">
                <AnimatedText text="Pseodo" />
              </h1>
              <motion.p 
                className="text-muted-foreground text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 2.0 }}
              >
                Smart content that connects with your audience
              </motion.p>
            </div>

            <form onSubmit={handleUrlSubmit} className="space-y-6">
              <div className="space-y-2">
                <Input
                  id="url"
                  placeholder="contentgardener.ai"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button 
                type="submit" 
                variant={isValidDomain(url) ? "default" : "outline"}
                className={`w-full h-12 text-base transition-all duration-300 ${
                  isValidDomain(url) 
                    ? 'bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 hover:shadow-lg hover:scale-[1.02]' 
                    : 'text-muted-foreground border-muted-foreground/20'
                }`}
              >
                <motion.span
                  animate={{ 
                    opacity: isValidDomain(url) ? 1 : 0.7,
                    scale: isValidDomain(url) ? 1.02 : 1
                  }}
                  transition={{ duration: 0.2 }}
                >
                  Get Started <ArrowRight className="ml-2 w-4 h-4 inline-block" />
                </motion.span>
              </Button>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="space-y-3 text-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Website Analysis
              </h2>
              <p className="text-lg text-muted-foreground">
                Analyzing your website structure
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                {["Fetching sitemap.xml", "Analyzing HTML structure", "Processing visible content"].map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className={`flex items-center gap-3 ${
                      progress >= (index === 0 ? 33 : index === 1 ? 66 : 100) ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <div className="w-5 h-5">
                      {progress >= (index === 0 ? 33 : index === 1 ? 66 : 100) ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <linearGradient id={`checkGradient${index}`} x1="4" y1="10" x2="16" y2="10" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#60A5FA" />
                                <stop offset="0.5" stopColor="#C084FC" />
                                <stop offset="1" stopColor="#F472B6" />
                              </linearGradient>
                            </defs>
                            <motion.path
                              d="M4 10.5L8 14.5L16 6.5"
                              stroke={`url(#checkGradient${index})`}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              transition={{ 
                                pathLength: { duration: 0.12, ease: "easeOut" },
                                opacity: { duration: 0.01 }
                              }}
                            />
                          </svg>
                        </motion.div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-primary/20" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{step}</span>
                  </motion.div>
                ))}
              </div>
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  {currentStepText}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Ready to Share Your Knowledge?
              </h2>
              <p className="text-muted-foreground text-lg">
                Pick how you want to help your readers today
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {contentTypes.map((type, index) => (
                  <motion.button
                    key={type.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: index * 0.1 }
                    }}
                    onClick={() => selectContentType(type.id)}
                    className={`p-6 text-left rounded-lg border transition-all duration-300 ${
                      selectedTypes.has(type.id)
                        ? "border-primary bg-primary/5" 
                        : "border-border/50 hover:border-border/80 hover:shadow-md"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {type.icon}
                        <h3 className="font-semibold">{type.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                      {type.recommended && (
                        <span className="inline-block text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded-full">
                          {type.recommended}
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
              
              <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground/70">
                    We noticed you like to...
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingObservations(!isEditingObservations)}
                    className="h-6 px-2 text-xs"
                  >
                    {isEditingObservations ? (
                      <>Done <CheckCircle2 className="ml-1 w-3 h-3" /></>
                    ) : (
                      <>Edit <Wand2 className="ml-1 w-3 h-3" /></>
                    )}
                  </Button>
                </div>
                <ul className="space-y-1.5">
                  {observations.map((observation, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="select-none">•</span>
                      {isEditingObservations ? (
                        <input
                          type="text"
                          value={observation}
                          onChange={(e) => {
                            const newObservations = [...observations];
                            newObservations[index] = e.target.value;
                            setObservations(newObservations);
                          }}
                          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary/20 rounded px-1"
                        />
                      ) : (
                        <span>{observation}</span>
                      )}
                    </li>
                  ))}
                  {isEditingObservations && (
                    <motion.li
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setObservations([...observations, ""])}
                        className="w-full h-6 text-xs justify-start text-muted-foreground/70 hover:text-muted-foreground"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add observation
                      </Button>
                    </motion.li>
                  )}
                </ul>
              </div>

              {selectedTypes.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <Button 
                    onClick={handleContentTypeNext}
                    className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                  >
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="space-y-3 text-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Content Processing
              </h2>
              <p className="text-lg text-muted-foreground">
                Research and planning
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                {["Conducting SEO keyword research", "Prioritizing content topics", "Writing your first content"].map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className={`flex items-center gap-3 ${
                      progress >= (index === 0 ? 33 : index === 1 ? 66 : 100) ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <div className="w-5 h-5">
                      {progress >= (index === 0 ? 33 : index === 1 ? 66 : 100) ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <linearGradient id={`checkGradient${index}Step4`} x1="4" y1="10" x2="16" y2="10" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#60A5FA" />
                                <stop offset="0.5" stopColor="#C084FC" />
                                <stop offset="1" stopColor="#F472B6" />
                              </linearGradient>
                            </defs>
                            <motion.path
                              d="M4 10.5L8 14.5L16 6.5"
                              stroke={`url(#checkGradient${index}Step4)`}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              transition={{ 
                                pathLength: { duration: 0.12, ease: "easeOut" },
                                opacity: { duration: 0.01 }
                              }}
                            />
                          </svg>
                        </motion.div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-primary/20" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{step}</span>
                  </motion.div>
                ))}
              </div>
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  {currentStepText}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Your Content Plan
              </h2>
              <p className="text-muted-foreground text-lg">
                Generated content and future schedule ✨
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Generated Content Column */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Generated Content
                  </h3>
                  <div className="flex items-center gap-2 invisible">
                    <Button variant="outline" size="sm" className="opacity-50 hover:opacity-100">
                      Bulk Edit <Wand2 className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto h-[700px] mt-4">
                  <motion.div className="p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-lg">
                        {generatedContent?.title}
                      </h4>
                      <select 
                        className="text-sm px-3 py-1.5 rounded-full bg-card border border-border/50 hover:border-border transition-colors"
                        defaultValue="review"
                      >
                        <option value="draft">Draft</option>
                        <option value="review">Ready for Review</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-4 h-4" />
                        {generatedContent?.estimatedReadTime}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {generatedContent?.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                        >
                          {keyword.replace(/\s+/g, '')}
                        </span>
                      ))}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {generatedContent && (
                        <div className="markdown-content space-y-4">
                          {generatedContent.content.split('\n\n').map((paragraph, index) => {
                            if (paragraph.startsWith('#')) {
                              const level = paragraph.match(/^#+/)[0].length;
                              const text = paragraph.replace(/^#+\s/, '');
                              const Tag = `h${level}` as keyof JSX.IntrinsicElements;
                              return <Tag key={index} className="font-bold">{text}</Tag>;
                            }
                            if (paragraph.startsWith('-')) {
                              return (
                                <ul key={index} className="list-disc pl-4 space-y-2">
                                  {paragraph.split('\n').map((item, i) => (
                                    <li key={i}>{item.replace('- ', '')}</li>
                                  ))}
                                </ul>
                              );
                            }
                            if (paragraph.startsWith('1.')) {
                              return (
                                <ol key={index} className="list-decimal pl-4 space-y-2">
                                  {paragraph.split('\n').map((item, i) => (
                                    <li key={i}>{item.replace(/\d+\.\s/, '')}</li>
                                  ))}
                                </ol>
                              );
                            }
                            return <p key={index}>{paragraph}</p>;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4 mt-6">
                      <Button className="flex-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                        Publish to CMS <Send className="ml-2 w-4 h-4" />
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Download as Markdown <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Content Calendar Column */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Content Calendar
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="opacity-50 hover:opacity-100">
                      Bulk Edit <Wand2 className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto h-[700px] mt-4">
                  <div className="space-y-4">
                    {futurePosts.map((post, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          transition: { delay: index * 0.05 }
                        }}
                        className="p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 hover:border-border/80 transition-all duration-300 relative group"
                      >
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 transition-opacity cursor-pointer"
                             onClick={() => togglePostSelection(index)}>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className="w-5 h-5"
                          >
                            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <linearGradient id={`checkGradient${index}Calendar`} x1="4" y1="10" x2="16" y2="10" gradientUnits="userSpaceOnUse">
                                  <stop stopColor="#60A5FA" />
                                  <stop offset="0.5" stopColor="#C084FC" />
                                  <stop offset="1" stopColor="#F472B6" />
                                </linearGradient>
                              </defs>
                              {selectedPosts[index] ? (
                                <motion.path
                                  d="M4 10.5L8 14.5L16 6.5"
                                  stroke={`url(#checkGradient${index}Calendar)`}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  initial={{ pathLength: 0, opacity: 0 }}
                                  animate={{ pathLength: 1, opacity: 1 }}
                                  transition={{ 
                                    pathLength: { duration: 0.12, ease: "easeOut" },
                                    opacity: { duration: 0.01 }
                                  }}
                                />
                              ) : (
                                <circle 
                                  cx="10" 
                                  cy="10" 
                                  r="9" 
                                  className="stroke-primary/20" 
                                  strokeWidth="2" 
                                  fill="none" 
                                />
                              )}
                            </svg>
                          </motion.div>
                        </div>
                        <div className="flex justify-between items-start gap-4 pl-6">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{post.title}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                post.status === 'draft' 
                                  ? 'bg-orange-500/10 text-orange-600' 
                                  : 'bg-green-500/10 text-green-600'
                              }`}>
                                {post.status === 'draft' ? 'Draft' : 'Scheduled'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {post.description}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {post.keywords.map((keyword, kidx) => (
                                <span 
                                  key={kidx}
                                  className="text-xs px-2 py-0.5 bg-primary/5 rounded-full text-primary"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-sm px-2 py-1 bg-primary/5 rounded-full text-primary">
                              {post.type}
                            </span>
                            <div className="flex flex-col items-end text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                {format(post.scheduledFor, 'MMM d, yyyy')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Search className="w-4 h-4" />
                                {post.estimatedReach}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </Card>

      {step === 1 && (
        <motion.div 
          className="flex flex-col items-center gap-2 w-full max-w-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 2.3 }}
        >
          <p className="text-sm text-muted-foreground text-center">
            We analyze your site, learn your style, and help create content that ranks
          </p>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="steps" className="border-none">
              <AccordionTrigger className="text-sm text-primary hover:no-underline py-2 flex justify-center gap-2 [&[data-state=open]>svg]:rotate-45 [&>svg:last-child]:hidden">
                Learn how <Plus className="h-4 w-4 transition-transform duration-200" />
              </AccordionTrigger>
              <AccordionContent className="overflow-hidden">
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card/50 backdrop-blur-sm rounded-lg p-4 mt-2"
                >
                  <ul className="space-y-4">
                    <motion.li 
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Search className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Analyze Your Site</p>
                        <p className="text-sm text-muted-foreground">We look at your website to understand it better</p>
                      </div>
                    </motion.li>
                    <motion.li 
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Book className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Learn Your Style</p>
                        <p className="text-sm text-muted-foreground">We understand how you like to write</p>
                      </div>
                    </motion.li>
                    <motion.li 
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <FileText className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Create Content</p>
                        <p className="text-sm text-muted-foreground">We help write stories people want to read</p>
                      </div>
                    </motion.li>
                    <motion.li 
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Send className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Publish</p>
                        <p className="text-sm text-muted-foreground">We put it right on your website</p>
                      </div>
                    </motion.li>
                  </ul>
                </motion.div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>
      )}
    </div>
  );
};

export default Index;