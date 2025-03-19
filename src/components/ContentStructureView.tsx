import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Plus, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TitleSuggestion, { Keyword } from './TitleSuggestion';
import EmptyState from './EmptyState';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';
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

// Helper function to format titles with proper Danish capitalization
const formatDanishTitle = (title: string): string => {
  // Danish titles only capitalize the first word and proper nouns
  // This is a simplified approach without proper noun detection
  
  // Split the title into words
  const words = title.split(' ');
  
  // Capitalize first word
  if (words.length > 0) {
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  }
  
  // Keep rest of words lowercase, except potential proper nouns
  // For proper implementation, this would need NLP to detect proper nouns
  for (let i = 1; i < words.length; i++) {
    // Simple heuristic: keep words that were originally capitalized as capitalized
    // This isn't perfect but helps retain proper nouns
    if (words[i].length > 0 && words[i][0] === words[i][0].toUpperCase()) {
      // This might be a proper noun, keep it capitalized
      continue;
    }
    words[i] = words[i].toLowerCase();
  }
  
  return words.join(' ');
};

// Simplified helper function to convert keywords array to Keyword objects
const convertToKeywords = (keywords: string[]): Keyword[] => {
  return keywords.map(keyword => ({
    text: keyword
  }));
};

// Default topics to use when generating initial content
const DEFAULT_TOPICS = [
  'WordPress Content Management',
  'SEO Best Practices',
  'Content Marketing Strategies'
];

const ContentStructureView: React.FC<ContentStructureViewProps> = ({ className }) => {
  const [selectedTitleId, setSelectedTitleId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [websiteContent, setWebsiteContent] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [contentFetchAttempted, setContentFetchAttempted] = useState(false);
  const [viewMode, setViewMode] = useState<'pending' | 'approved' | 'declined'>('pending');
  const generationAttemptedRef = useRef(false);
  const isMountedRef = useRef(true);
  const { publicationFrequency, subjectMatters, writingStyle } = useSettings();
  const { currentWebsite } = useWebsites();
  const { postThemes, isLoading: themesLoading, fetchPostThemes, createPostTheme, updatePostTheme } = usePostThemes();
  
  // Function to get the next publication date
  const getPublicationDate = useCallback(() => {
    try {
      // Get calendar content from localStorage
      const calendarContent = JSON.parse(localStorage.getItem('calendarContent') || '[]');
      
      if (!calendarContent || calendarContent.length === 0) {
        // If no calendar content, use today + publication frequency
        const result = addDays(new Date(), publicationFrequency);
        console.log('No calendar content, using today + frequency:', format(result, 'yyyy-MM-dd'));
        return result;
      }
      
      // Find the absolute latest date through a simple loop
      let latestTimestamp = 0;
      let latestDateString = '';
      
      for (const item of calendarContent) {
        if (!item.date) continue;
        
        try {
          const dateObj = new Date(item.date);
          const timestamp = dateObj.getTime();
          
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            latestDateString = item.date;
          }
        } catch (e) {
          console.error('Error parsing date:', item.date, e);
        }
      }
      
      if (latestTimestamp === 0) {
        // No valid dates found, use today + publication frequency
        const result = addDays(new Date(), publicationFrequency);
        console.log('No valid dates found, using today + frequency:', format(result, 'yyyy-MM-dd'));
        return result;
      }
      
      // We found a valid latest date, add publication frequency to it
      const latestDate = new Date(latestTimestamp);
      console.log('Found latest calendar date:', format(latestDate, 'yyyy-MM-dd'));
      
      const result = addDays(latestDate, publicationFrequency);
      console.log('Next publication date:', format(result, 'yyyy-MM-dd'));
      return result;
    } catch (error) {
      console.error('Error in getPublicationDate:', error);
      // Fallback to today + publication frequency
      return addDays(new Date(), publicationFrequency);
    }
  }, [publicationFrequency]);
  
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
            console.log(`Attempting to fetch content for ${currentWebsite.url} using aiEndpoints.fetchWebsiteContent`);
            const content = await fetchWebsiteContent(currentWebsite.url, currentWebsite.id);
            if (isMountedRef.current) {
              setWebsiteContent(content);
              console.log('Website content fetched successfully, received', content.length, 'characters');
            }
          } catch (error) {
            console.error('Error fetching website content:', error);
            if (isMountedRef.current) {
              // No fallback to mock content anymore
              console.log('Unable to fetch website content');
            }
          }
        }
      } catch (error) {
        console.error('Error during initialization:', error);
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
    // 6. The input is empty (new condition)
    // 7. Website content is available
    if (
      isInitializing || 
      isGenerating || 
      themesLoading || 
      !currentWebsite?.id || 
      postThemes.length > 0 || 
      generationAttemptedRef.current || 
      inputValue.trim() !== '' || // Only generate if input is empty
      !websiteContent // Only generate if website content is available
    ) {
      return;
    }
    
    const generateInitialPosts = async () => {
      // Mark that we've attempted generation to prevent loops
      generationAttemptedRef.current = true;
      
      console.log('No posts found and input empty, generating initial content...');
      setIsGenerating(true);
      
      try {
        // Generate 3 posts with default topics
        const topics = subjectMatters.length > 0 ? subjectMatters.slice(0, 3) : DEFAULT_TOPICS;
        let successCount = 0;
        
        // Get a single publication date for all posts
        const publicationDate = getPublicationDate();
        
        for (let i = 0; i < topics.length; i++) {
          const topic = topics[i];
          try {
            // Use subject matters directly for keywords
            const keywords = [topic.toLowerCase()];
            
            // Add a few common WordPress-related keywords if needed
            if (keywords.length < 2) {
              keywords.push('wordpress', 'content');
            }
            
            // Generate title suggestions
            const result = await generateTitleSuggestions(
              websiteContent,
              keywords,
              writingStyle || 'Professional and informative',
              [topic]
            );
            
            if (result.titles.length > 0) {
              // Check if likely Danish content
              const isDanish = subjectMatters.some(subject => 
                subject.toLowerCase().includes('dansk') || 
                subject.toLowerCase().includes('personale') || 
                subject.toLowerCase().includes('arbejdskraft')
              );
              
              // Format the title with proper Danish capitalization if needed
              const formattedTitle = isDanish ? formatDanishTitle(result.titles[0]) : result.titles[0];
              
              // Create a post theme for the first title with the same publication date for all
              // Use showToast: false for all but the last one to avoid toast spam
              const isLastPost = i === topics.length - 1;
              await createPostTheme(
                formattedTitle, 
                result.keywords, 
                publicationDate.toISOString(),
                isLastPost // Only show toast for the last post
              );
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
    fetchPostThemes,
    inputValue,
    getPublicationDate
  ]);
  
  // Modify the existing function to handle empty input
  const handleGenerateTitleSuggestions = async () => {
    // If input is empty, use subject matters instead
    if (!inputValue.trim()) {
      handleGenerateFromSubjects();
      return;
    }
    
    if (!currentWebsite?.url) {
      toast.error('Please select a website first');
      return;
    }
    
    if (!websiteContent) {
      toast.error('Website content not available. Please try again later');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Parse keywords from input
      let keywords = inputValue.split(',').map(k => k.trim()).filter(k => k);
      
      if (keywords.length === 0) {
        toast.error('Please enter valid keywords separated by commas');
        setIsGenerating(false);
        return;
      }
      
      // Try to match keywords with subject matters
      const matchedKeywords = keywords.map(keyword => {
        // Find an exact or close match in subjectMatters
        const matchedSubject = subjectMatters.find(subject => 
          subject.toLowerCase() === keyword.toLowerCase() ||
          subject.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(subject.toLowerCase())
        );
        
        return matchedSubject || keyword;
      });
      
      console.log(`Using website content (${websiteContent.length} characters) for title generation`);
      console.log('Keywords aligned with subject matters:', matchedKeywords);
      
      // Generate title suggestions using AI
      const result = await generateTitleSuggestions(
        websiteContent,
        matchedKeywords,
        writingStyle || 'Professional and informative',
        subjectMatters
      );
      
      // Get a single publication date for all posts
      const publicationDate = getPublicationDate();
      console.log('Setting all posts to publish on:', format(publicationDate, 'MMM dd, yyyy'));
      
      // Create post themes for each title with the same publication date
      const creationPromises = result.titles.map((title, index) => {
        // Use unique keywords for each title if available, otherwise fall back to the default keywords
        const titleKeywords = result.keywordsByTitle?.[title] || result.keywords;
        
        // Format the title with proper Danish capitalization if the content is likely in Danish
        const isDanish = subjectMatters.some(subject => 
          subject.toLowerCase().includes('dansk') || 
          subject.toLowerCase().includes('personale') || 
          subject.toLowerCase().includes('arbejdskraft')
        ) || inputValue.toLowerCase().includes('dansk');
        const formattedTitle = isDanish ? formatDanishTitle(title) : title;
        
        // Use the same publication date for all posts
        // Only show toast for the last post to avoid toast spam
        const isLastPost = index === result.titles.length - 1;
        
        return createPostTheme(
          formattedTitle,
          titleKeywords,
          publicationDate.toISOString(),
          isLastPost
        );
      });
      
      await Promise.all(creationPromises);
      
      // Refresh the list of post themes
      await fetchPostThemes();
      
      // Clear the input
      setInputValue('');
      
      toast.success(`${result.titles.length} title suggestions generated for ${format(publicationDate, 'MMM dd, yyyy')}`);
    } catch (error) {
      console.error('Error generating title suggestions:', error);
      toast.error('Failed to generate title suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update the function to generate suggestions using subject matters
  const handleGenerateFromSubjects = async () => {
    if (!currentWebsite?.url) {
      toast.error('Please select a website first');
      return;
    }
    
    if (!websiteContent) {
      toast.error('Website content not available. Please try again later');
      return;
    }
    
    if (!subjectMatters || subjectMatters.length === 0) {
      toast.error('No subject matters defined. Please add some in Settings');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Use subject matters directly as keywords
      const keywords = subjectMatters.slice(0, 3); // Use up to 3 subject matters
      
      console.log(`Using website content (${websiteContent.length} characters) for title generation`);
      console.log('Using subject matters as keywords:', keywords);
      
      // Generate title suggestions using AI
      const result = await generateTitleSuggestions(
        websiteContent,
        keywords,
        writingStyle || 'Professional and informative',
        subjectMatters
      );
      
      // Get a single publication date for all posts
      const publicationDate = getPublicationDate();
      console.log('Setting all posts to publish on:', format(publicationDate, 'MMM dd, yyyy'));
      
      // Create post themes for each title with the same publication date
      const creationPromises = result.titles.map((title, index) => {
        // Use unique keywords for each title if available, otherwise fall back to the default keywords
        const titleKeywords = result.keywordsByTitle?.[title] || result.keywords;
        
        // Format the title with proper Danish capitalization if the content is likely in Danish
        const isDanish = subjectMatters.some(subject => 
          subject.toLowerCase().includes('dansk') || 
          subject.toLowerCase().includes('personale') || 
          subject.toLowerCase().includes('arbejdskraft')
        );
        const formattedTitle = isDanish ? formatDanishTitle(title) : title;
        
        // Use the same publication date for all posts
        // Only show toast for the last post to avoid toast spam
        const isLastPost = index === result.titles.length - 1;
        
        return createPostTheme(
          formattedTitle,
          titleKeywords,
          publicationDate.toISOString(),
          isLastPost
        );
      });
      
      await Promise.all(creationPromises);
      
      // Refresh the list of post themes
      await fetchPostThemes();
      
      toast.success(`${result.titles.length} title suggestions generated for ${format(publicationDate, 'MMM dd, yyyy')}`);
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

  /**
   * Handler called when a title suggestion is approved (liked)
   * When a post is approved, this function updates all remaining pending posts
   * to be scheduled for a new future date based on the latest calendar date plus publication frequency
   * 
   * @param approvedDate The date of the post that was just approved
   */
  const handleTitleLiked = () => {
    // Find all pending posts
    const pendingPosts = postThemes.filter(theme => theme.status === 'pending');
    
    if (pendingPosts.length === 0) {
      return; // No pending posts to update
    }
    
    // Calculate the next publication date based on the calendar
    const nextPublicationDate = getPublicationDate();
    
    console.log(`Updating ${pendingPosts.length} pending posts to ${format(nextPublicationDate, 'MMM dd, yyyy')}`);
    
    // Update all pending posts to the same future date
    pendingPosts.forEach(post => {
      // Use false to avoid toast spam
      updatePostTheme(post.id, { scheduled_date: nextPublicationDate.toISOString() }, false);
    });
    
    // Show one summary toast instead of individual ones
    toast.info(`Updated ${pendingPosts.length} pending posts to ${format(nextPublicationDate, 'MMM dd, yyyy')}`);
  };

  const handleUpdateKeywords = (id: string, keywords: string[]) => {
    // Use updatePostTheme which handles state updates internally
    updatePostTheme(id, { keywords });
    // No need to call fetchPostThemes() as updatePostTheme already updates local state
  };

  // Filter suggestions based on view mode
  const filteredTitleSuggestions = postThemes
    .filter(theme => {
      if (viewMode === 'pending') {
        return theme.status === 'pending';
      } else if (viewMode === 'approved') {
        return theme.status === 'approved' || theme.status === 'published';
      } else if (viewMode === 'declined') {
        return theme.status === 'declined';
      }
      return false;
    })
    // Sort by created_at date, newest first
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(theme => ({
    id: theme.id,
    title: theme.subject_matter,
    keywords: convertToKeywords(theme.keywords),
      date: theme.scheduled_date ? new Date(theme.scheduled_date) : new Date(),
    status: theme.status
  }));

  // Get the appropriate view title and description
  const getViewInfo = () => {
    switch (viewMode) {
      case 'approved':
        return {
          title: "Approved Suggestions",
          description: "These suggestions have been approved and added to your calendar.",
          alertClass: "bg-green-50 border-green-200"
        };
      case 'declined':
        return {
          title: "Declined Suggestions",
          description: "These suggestions have been previously declined.",
          alertClass: "bg-red-50 border-red-200"
        };
      default:
        return {
          title: "",
          description: "",
          alertClass: ""
        };
    }
  };

  const viewInfo = getViewInfo();

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
            disabled={isGenerating || !currentWebsite || isLoading}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {inputValue.trim() ? 'Generate from Keywords' : 'Generate from Subjects'}
              </>
            )}
          </Button>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-muted-foreground">
          {websiteContent ? 
            "Website content analyzed and ready for title generation" : 
            currentWebsite ? 
                "Waiting for website content analysis..." : 
              "Select a website to analyze content"
          }
        </p>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'pending' ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setViewMode('pending')}
            >
              Pending
            </Button>
            <Button
              variant={viewMode === 'approved' ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setViewMode('approved')}
            >
              Approved
            </Button>
            <Button
              variant={viewMode === 'declined' ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setViewMode('declined')}
            >
              Declined
            </Button>
          </div>
        </div>
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
      ) : filteredTitleSuggestions.length > 0 ? (
        <div className="grid gap-4">
          {viewMode !== 'pending' && (
            <Alert className={`mb-2 ${viewInfo.alertClass}`}>
              <AlertDescription>
                {viewInfo.description}
              </AlertDescription>
            </Alert>
          )}
          {filteredTitleSuggestions.map((title) => (
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
              onUpdateKeywords={(keywords) => handleUpdateKeywords(title.id, keywords)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Globe className="h-8 w-8 text-muted-foreground" />}
          title={
            viewMode === 'pending' ? "No Pending Suggestions" :
            viewMode === 'approved' ? "No Approved Suggestions" :
            "No Declined Suggestions"
          }
          description={
            viewMode === 'pending' 
              ? "Generate title suggestions based on your website content and keywords" 
              : viewMode === 'approved'
                ? "You haven't approved any suggestions yet."
                : "You haven't declined any suggestions yet."
          }
          actionLabel={
            viewMode === 'pending' 
              ? "Generate Suggestions" 
              : "View Pending Suggestions"
          } 
          onAction={
            viewMode === 'pending' 
              ? handleGenerateTitleSuggestions 
              : () => setViewMode('pending')
          }
        />
      )}
    </div>
  );
};

export default ContentStructureView;
