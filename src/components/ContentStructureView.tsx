import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Plus, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TitleSuggestion from './TitleSuggestion';
import EmptyState from './EmptyState';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';
import { useSettings } from '@/context/SettingsContext';
import { usePostThemes } from '@/context/PostThemesContext';
import { useWebsites } from '@/context/WebsitesContext';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/integrations/supabase/client';

interface ContentStructureViewProps {
  className?: string;
}

interface TitleSuggestionProps {
  id: string;
  title: string;
  keywords: string[];
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  date: string;
  onUpdateDate: (newDate: string) => void;
  onLiked: () => void;
  status: 'pending' | 'generated' | 'published';
  onUpdateKeywords: (keywords: string[]) => void;
  isGeneratingContent: boolean;
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
  const [viewMode, setViewMode] = useState<'pending' | 'generated' | 'published'>('pending');
  const generationAttemptedRef = useRef(false);
  const isMountedRef = useRef(true);
  const { publicationFrequency, subjectMatters, writingStyle } = useSettings();
  const { currentWebsite } = useWebsites();
  const { 
    postThemes, 
    isLoading: themesLoading, 
    fetchPostThemes, 
    addPostTheme,
    updatePostTheme,
    isGeneratingContent,
    getNextPublicationDate
  } = usePostThemes();
  
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
        
        // Set initialization complete
        if (isMountedRef.current) {
          setIsInitializing(false);
          console.log('Initialization complete');
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
  }, [isInitializing, currentWebsite?.url, fetchPostThemes]);
  
  // Auto-generate posts if none exist after initialization
  useEffect(() => {
    // Only proceed if:
    // 1. We're not initializing anymore
    // 2. We're not already generating
    // 3. We have a website
    // 4. We have no posts
    // 5. We haven't attempted generation yet
    // 6. The input is empty (new condition)
    if (
      isInitializing || 
      isGenerating || 
      themesLoading || 
      !currentWebsite?.id || 
      postThemes.length > 0 || 
      generationAttemptedRef.current || 
      inputValue.trim() !== ''
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
        const publicationDate = getNextPublicationDate();

        // Get current session for authentication
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.access_token) {
          throw new Error('No access token found');
        }

        // Call the edge function directly
        const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-post-ideas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`
          },
          body: JSON.stringify({
            website_id: currentWebsite.id,
            keywords: topics,
            writing_style: writingStyle,
            subject_matters: topics
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate title suggestions');
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to generate title suggestions');
        }

        // Create post themes for each title
        const creationPromises = result.titles.map(title => 
          addPostTheme({
            website_id: currentWebsite.id,
            subject_matter: title,
            keywords: result.keywordsByTitle?.[title] || result.keywords,
            status: 'pending',
            scheduled_date: publicationDate.toISOString(),
            post_content: null,
            image: null,
            wp_post_id: null,
            wp_post_url: null,
            wp_sent_date: null
          })
        );
        
        await Promise.all(creationPromises);
        
        // Only refresh and show toast if we successfully created at least one post
        if (result.titles.length > 0 && isMountedRef.current) {
          // Refresh the list of post themes
          await fetchPostThemes();
          toast.success(`Generated ${result.titles.length} initial content suggestions for you`);
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
    subjectMatters, 
    writingStyle, 
    addPostTheme, 
    fetchPostThemes,
    inputValue,
    getNextPublicationDate
  ]);
  
  // Modify the existing function to handle empty input
  const handleGenerateTitleSuggestions = async () => {
    // If input is empty, use subject matters instead
    if (!inputValue.trim()) {
      handleGenerateFromSubjects();
      return;
    }
    
    if (!currentWebsite?.id) {
      toast.error('Please select a website first');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Get current session for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('No access token found');
      }

      // Call the edge function directly
      const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-post-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          website_id: currentWebsite.id,
          keywords: [inputValue], // Use input value as keyword
          writing_style: writingStyle,
          subject_matters: subjectMatters
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate title suggestions');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate title suggestions');
      }

      // Get a single publication date for all posts
      const publicationDate = getNextPublicationDate();
      console.log('Setting all posts to publish on:', format(publicationDate, 'MMM dd, yyyy'));
      
      // Create post themes for each title with the same publication date
      const creationPromises = result.titles.map(title => 
        addPostTheme({
          website_id: currentWebsite.id,
          subject_matter: title,
          keywords: result.keywordsByTitle?.[title] || result.keywords,
          status: 'pending',
          scheduled_date: publicationDate.toISOString(),
          post_content: null,
          image: null,
          wp_post_id: null,
          wp_post_url: null,
          wp_sent_date: null
        })
      );
      
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
    if (!subjectMatters.length) {
      toast.error('Please add at least one subject matter first');
      return;
    }

    if (!currentWebsite?.id) {
      toast.error('Please select a website first');
      return;
    }

    setIsGenerating(true);
    try {
      // Get current session for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('No access token found');
      }

      // Call the edge function directly
      const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-post-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          website_id: currentWebsite.id,
          keywords: subjectMatters,
          writing_style: writingStyle,
          subject_matters: subjectMatters
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate title suggestions');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate title suggestions');
      }

      const publicationDate = getNextPublicationDate();
      console.log('Setting all posts to publish on:', format(publicationDate, 'MMM dd, yyyy'));
      
      // Create post themes for each title with the same publication date
      const creationPromises = result.titles.map(title => 
        addPostTheme({
          website_id: currentWebsite.id,
          subject_matter: title,
          keywords: result.keywordsByTitle?.[title] || result.keywords,
          status: 'pending',
          scheduled_date: publicationDate.toISOString(),
          post_content: null,
          image: null,
          wp_post_id: null,
          wp_post_url: null,
          wp_sent_date: null
        })
      );
      
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
   * This function:
   * 1. Updates the status of the liked post to 'generated'
   * 2. Increments the dates of all other pending posts by one day
   * 
   * @param id The ID of the post that was liked
   */
  const handleTitleLiked = (id: string) => {
    // Find the specific post that was liked
    const likedPost = postThemes.find(theme => theme.id === id);
    
    if (!likedPost) {
      return; // Post not found
    }
    
    // Update the liked post to 'generated' status
    updatePostTheme(id, { status: 'generated' });
    
    // Find all other pending posts
    const otherPendingPosts = postThemes.filter(theme => 
      theme.status === 'pending' && theme.id !== id
    );
    
    // Update each pending post's date to be one day later
    otherPendingPosts.forEach(post => {
      const currentDate = new Date(post.scheduled_date);
      const nextDate = addDays(currentDate, 1);
      updatePostTheme(post.id, { scheduled_date: nextDate.toISOString() }, false);
    });
    
    // Show success toast
    toast.success(`"${likedPost.subject_matter}" has been added to your calendar`);
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
      } else if (viewMode === 'generated') {
        return theme.status === 'generated';
      } else if (viewMode === 'published') {
        return theme.status === 'published';
      }
      return false;
    })
    // Sort by created_at date, newest first
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(theme => ({
      id: theme.id,
      title: theme.subject_matter,
      keywords: theme.keywords,
      date: new Date(theme.scheduled_date),
      status: theme.status as 'pending' | 'generated' | 'published'
    }));

  // Get the appropriate view title and description
  const getViewInfo = () => {
    switch (viewMode) {
      case 'generated':
        return {
          title: "Generated Suggestions",
          description: "These suggestions have been generated and added to your calendar.",
          alertClass: "bg-green-50 border-green-200"
        };
      case 'published':
        return {
          title: "Published Suggestions",
          description: "These suggestions have been published and added to your calendar.",
          alertClass: "bg-green-50 border-green-200"
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
  
  // Separate loading state for input/button disabling
  const isInputDisabled = isGenerating || !currentWebsite;

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
            disabled={isInputDisabled}
          />
          <Button 
            onClick={handleGenerateTitleSuggestions} 
            disabled={isInputDisabled}
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
              variant={viewMode === 'generated' ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setViewMode('generated')}
            >
              Generated
            </Button>
            <Button
              variant={viewMode === 'published' ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setViewMode('published')}
            >
              Published
            </Button>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {filteredTitleSuggestions.length > 0 && (
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
                  onUpdateDate={handleUpdateTitleDate}
                  onLiked={() => handleTitleLiked(title.id)}
                  status={title.status}
                  onUpdateKeywords={handleUpdateKeywords}
                  isGeneratingContent={isGeneratingContent(title.id)}
                />
              ))}
            </div>
          )}
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">
              {isGenerating ? 'Generating content suggestions...' : 
               isInitializing ? 'Initializing content...' : 
               'Loading title suggestions...'}
            </span>
          </div>
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
              onUpdateDate={handleUpdateTitleDate}
              onLiked={() => handleTitleLiked(title.id)}
              status={title.status}
              onUpdateKeywords={handleUpdateKeywords}
              isGeneratingContent={isGeneratingContent(title.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Globe className="h-8 w-8 text-muted-foreground" />}
          title={
            viewMode === 'pending' ? "No Pending Suggestions" :
            viewMode === 'generated' ? "No Generated Suggestions" :
            "No Published Suggestions"
          }
          description={
            viewMode === 'pending' 
              ? "Generate title suggestions based on your website content and keywords" 
              : viewMode === 'generated'
                ? "You haven't generated any suggestions yet."
                : "You haven't published any suggestions yet."
          }
          actionLabel={
            viewMode === 'pending' 
              ? "Generate Suggestions" 
              : viewMode === 'generated'
                ? "View Generated Suggestions"
                : "View Published Suggestions"
          } 
          onAction={
            viewMode === 'pending' 
              ? handleGenerateTitleSuggestions 
              : viewMode === 'generated'
                ? () => setViewMode('pending')
                : () => setViewMode('pending')
          }
        />
      )}
    </div>
  );
};

export default ContentStructureView;
