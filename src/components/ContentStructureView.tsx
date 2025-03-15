import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Plus, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TitleSuggestion, { Keyword } from './TitleSuggestion';
import EmptyState from './EmptyState';
import { cn } from '@/lib/utils';
import { addDays } from 'date-fns';
import { useSettings } from '@/context/SettingsContext';
import { usePostThemes } from '@/context/PostThemesContext';
import { useWebsites } from '@/context/WebsitesContext';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchWebsiteContent } from '@/api/aiEndpoints';
import { generateTitleSuggestions } from '@/services/aiService';

interface ContentStructureViewProps {
  className?: string;
}

// Helper function to convert keywords array to Keyword objects
const convertToKeywords = (keywords: string[]): Keyword[] => {
  // Assign random difficulty levels for demonstration
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
  
  return keywords.map(keyword => ({
    text: keyword,
    difficulty: difficulties[Math.floor(Math.random() * difficulties.length)]
  }));
};

// Default topics to use when generating initial content
const DEFAULT_TOPICS = [
  'WordPress Content Management',
  'SEO Best Practices',
  'Content Marketing Strategies'
];

// Mock content for fallback
const MOCK_CONTENT = `
  This is a website about WordPress content management.
  We provide tips and guides for optimizing your WordPress site.
  Topics include SEO, content marketing, plugin recommendations, and performance optimization.
  Our goal is to help you create a better WordPress website with engaging content.
`;

const ContentStructureView: React.FC<ContentStructureViewProps> = ({ className }) => {
  const [selectedTitleId, setSelectedTitleId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [websiteContent, setWebsiteContent] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [contentFetchAttempted, setContentFetchAttempted] = useState(false);
  const generationAttemptedRef = useRef(false);
  const isMountedRef = useRef(true);
  const { publicationFrequency, subjectMatters, writingStyle } = useSettings();
  const { currentWebsite } = useWebsites();
  const { postThemes, isLoading: themesLoading, fetchPostThemes, createPostTheme } = usePostThemes();
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Reset state when website changes
  useEffect(() => {
    if (currentWebsite) {
      setIsInitializing(true);
      setContentFetchAttempted(false);
      setWebsiteContent(null);
      generationAttemptedRef.current = false;
    }
  }, [currentWebsite?.id]);
  
  // Initialize data - fetch post themes and website content
  useEffect(() => {
    const initialize = async () => {
      if (!isInitializing || !isMountedRef.current) return;
      
      try {
        // Fetch post themes
        await fetchPostThemes();
        
        // Fetch website content if we have a URL and haven't tried yet
        if (currentWebsite?.url && !contentFetchAttempted && !websiteContent) {
          setContentFetchAttempted(true);
          
          try {
            console.log(`Attempting to fetch content for ${currentWebsite.url}`);
            const content = await fetchWebsiteContent(currentWebsite.url);
            if (isMountedRef.current) {
              setWebsiteContent(content);
              console.log('Website content fetched successfully');
            }
          } catch (error) {
            console.error('Error fetching website content:', error);
            if (isMountedRef.current) {
              // Use mock content as fallback
              setWebsiteContent(MOCK_CONTENT);
              console.log('Using mock content as fallback due to error');
            }
          }
        } else if (!websiteContent) {
          // No URL or already attempted, use mock content
          setWebsiteContent(MOCK_CONTENT);
          console.log('Using mock content as fallback (no URL or already attempted)');
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        // Ensure we have fallback content
        if (!websiteContent && isMountedRef.current) {
          setWebsiteContent(MOCK_CONTENT);
          console.log('Using mock content as fallback due to initialization error');
        }
      } finally {
        if (isMountedRef.current) {
          setIsInitializing(false);
          console.log('Initialization complete');
        }
      }
    };
    
    if (isInitializing) {
      console.log('Starting initialization');
      initialize();
    }
  }, [isInitializing, currentWebsite?.url, fetchPostThemes, contentFetchAttempted, websiteContent]);
  
  // Auto-generate posts if none exist after initialization
  useEffect(() => {
    // Only proceed if:
    // 1. We're not initializing anymore
    // 2. We're not already generating
    // 3. We have a website
    // 4. We have no posts
    // 5. We haven't attempted generation yet
    if (
      isInitializing || 
      isGenerating || 
      themesLoading || 
      !currentWebsite?.id || 
      postThemes.length > 0 || 
      generationAttemptedRef.current
    ) {
      return;
    }
    
    const generateInitialPosts = async () => {
      // Mark that we've attempted generation to prevent loops
      generationAttemptedRef.current = true;
      
      console.log('No posts found, generating initial content...');
      setIsGenerating(true);
      
      try {
        // Use existing website content or fallback
        const content = websiteContent || MOCK_CONTENT;
        
        // Generate 3 posts with default topics
        const topics = subjectMatters.length > 0 ? subjectMatters.slice(0, 3) : DEFAULT_TOPICS;
        let successCount = 0;
        
        for (const topic of topics) {
          try {
            // Generate keywords based on the topic
            const keywords = [topic.toLowerCase(), 'wordpress', 'content', 'digital marketing'];
            
            // Generate title suggestions
            const result = await generateTitleSuggestions(
              content,
              keywords,
              writingStyle || 'Professional and informative',
              [topic]
            );
            
            if (result.titles.length > 0) {
              // Create a post theme for the first title
              await createPostTheme(result.titles[0], result.keywords);
              console.log(`Generated initial post for topic: ${topic}`);
              successCount++;
            }
          } catch (error) {
            console.error(`Error generating initial post for topic ${topic}:`, error);
          }
        }
        
        // Only refresh and show toast if we successfully created at least one post
        if (successCount > 0 && isMountedRef.current) {
          // Refresh the list of post themes
          await fetchPostThemes();
          toast.success(`Generated ${successCount} initial content suggestions for you`);
        }
      } catch (error) {
        console.error('Error during initial content generation:', error);
      } finally {
        if (isMountedRef.current) {
          setIsGenerating(false);
        }
      }
    };
    
    // Use a timeout to avoid immediate generation
    const timer = setTimeout(generateInitialPosts, 500);
    return () => clearTimeout(timer);
  }, [
    isInitializing, 
    isGenerating,
    themesLoading, 
    currentWebsite?.id, 
    postThemes.length, 
    websiteContent, 
    subjectMatters, 
    writingStyle, 
    createPostTheme, 
    fetchPostThemes
  ]);
  
  // Generate title suggestions based on input keywords
  const handleGenerateTitleSuggestions = async () => {
    if (!inputValue.trim()) {
      toast.error('Please enter keywords to generate title suggestions');
      return;
    }
    
    if (!currentWebsite?.url) {
      toast.error('Please select a website first');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Parse keywords from input
      const keywords = inputValue.split(',').map(k => k.trim()).filter(k => k);
      
      if (keywords.length === 0) {
        toast.error('Please enter valid keywords separated by commas');
        return;
      }
      
      // Use existing website content or fallback
      let content = websiteContent || MOCK_CONTENT;
      
      // Log the content length for debugging
      console.log(`Using website content (${content.length} characters) for title generation`);
      
      // Generate title suggestions using AI
      const result = await generateTitleSuggestions(
        content,
        keywords,
        writingStyle || 'Professional and informative',
        subjectMatters
      );
      
      // Create post themes for each title
      const creationPromises = result.titles.map(title => 
        createPostTheme(title, result.keywords)
      );
      
      await Promise.all(creationPromises);
      
      // Refresh the list of post themes
      await fetchPostThemes();
      
      // Clear the input
      setInputValue('');
      
      toast.success(`${result.titles.length} title suggestions generated successfully`);
    } catch (error) {
      console.error('Error generating title suggestions:', error);
      toast.error('Failed to generate title suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectTitle = (id: string) => {
    setSelectedTitleId(id === selectedTitleId ? null : id);
  };

  const handleRemoveTitle = (id: string) => {
    // This will be handled by the TitleSuggestion component
  };

  const handleUpdateTitleDate = (id: string, newDate: Date) => {
    // This will be handled by the TitleSuggestion component
  };

  const handleTitleLiked = () => {
    // Refresh the list after a title is liked
    fetchPostThemes();
  };

  // Convert post themes to title suggestions format
  const titleSuggestions = postThemes.map(theme => ({
    id: theme.id,
    title: theme.subject_matter,
    keywords: convertToKeywords(theme.keywords),
    date: new Date(theme.scheduled_date),
    status: theme.status
  }));

  // Determine if we're in a loading state
  const isLoading = isInitializing || themesLoading || isGenerating;

  return (
    <div className={className}>
      {currentWebsite && (
        <Alert className="bg-muted/50 border-muted mb-4">
          <Globe className="h-4 w-4" />
          <AlertDescription>
            Generating content for <strong>{currentWebsite.name}</strong> ({currentWebsite.url})
          </AlertDescription>
        </Alert>
      )}
      
      <div className="mb-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter keywords (e.g., wordpress, seo, content marketing)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isGenerating && inputValue.trim() && currentWebsite) {
                e.preventDefault();
                handleGenerateTitleSuggestions();
              }
            }}
            disabled={isLoading}
          />
          <Button 
            onClick={handleGenerateTitleSuggestions} 
            disabled={isGenerating || !inputValue.trim() || !currentWebsite || isLoading}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Suggestions
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {websiteContent ? 
            "Website content analyzed and ready for title generation" : 
            currentWebsite ? 
              "Analyzing website content..." : 
              "Select a website to analyze content"
          }
        </p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            {isGenerating ? 'Generating content suggestions...' : 
             isInitializing ? 'Initializing content...' : 
             'Loading title suggestions...'}
          </span>
        </div>
      ) : titleSuggestions.length > 0 ? (
        <div className="grid gap-4">
          {titleSuggestions.map((title) => (
            <TitleSuggestion
              key={title.id}
              id={title.id}
              title={title.title}
              keywords={title.keywords}
              selected={selectedTitleId === title.id}
              onSelect={() => handleSelectTitle(title.id)}
              onRemove={() => handleRemoveTitle(title.id)}
              date={title.date}
              onUpdateDate={(newDate) => handleUpdateTitleDate(title.id, newDate)}
              onLiked={handleTitleLiked}
              status={title.status}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Plus className="h-6 w-6" />}
          title="No Title Suggestions Yet"
          description={subjectMatters.length > 0 
            ? "Enter keywords and generate title suggestions, or use the 'Generate' button on the Settings page for your subject matters."
            : "Enter keywords and generate title suggestions, or add subject matters on the Settings page."}
          actionLabel="Generate Titles"
          onAction={handleGenerateTitleSuggestions}
          className="py-6"
        />
      )}
    </div>
  );
};

export default ContentStructureView;
