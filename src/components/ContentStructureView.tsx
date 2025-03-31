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
import { Tables } from '@/types/supabase';

type PostTheme = Tables['post_themes']['Row'] & {
  categories: { id: string; name: string }[];
  status: 'pending' | 'approved' | 'published';
};

interface ContentStructureViewProps {
  className?: string;
}

interface TitleSuggestionProps {
  id: string;
  title: string;
  keywords: string[];
  categories: { id: string; name: string }[];
  selected?: boolean;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
  date: Date;
  onUpdateDate?: (date: Date) => void;
  onLiked?: () => void;
  status: 'pending' | 'approved' | 'published';
  onUpdateKeywords?: (id: string, keywords: string[]) => void;
  onUpdateCategories?: (id: string, categories: { id: string; name: string }[]) => void;
  isGeneratingContent?: boolean;
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
  const [viewMode, setViewMode] = useState<'pending' | 'approved' | 'published'>('pending');
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
    getNextPublicationDate,
    setPostThemes
  } = usePostThemes();
  
  // Add categoriesByTitle state
  const [categoriesByTitle, setCategoriesByTitle] = useState<{ [title: string]: { id: string; name: string }[] }>({});
  
  // Add state for furthest future date
  const [furthestFutureDate, setFurthestFutureDate] = useState<Date>(new Date());
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;
  
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
        // Set initialization complete even on error to prevent infinite loading
        if (isMountedRef.current) {
          setIsInitializing(false);
          console.log('Initialization complete (with error)');
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
    
    // Auto-apply functionality commented out
    /*
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
            categories: result.categoriesByTitle?.[title] || [],
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
    */
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
  
  // Update furthest future date when needed
  useEffect(() => {
    const updateFurthestDate = async () => {
      if (!currentWebsite?.id) return;
      
      try {
        // Get the furthest future date from approved and published posts
        const { data: themesData, error } = await supabase
          .from('post_themes')
          .select('scheduled_date')
          .eq('website_id', currentWebsite.id)
          .in('status', ['approved', 'published'])
          .order('scheduled_date', { ascending: false })
          .limit(1);

        if (error) throw error;

        // Define a minimum valid timestamp (2020-01-01)
        const minValidTimestamp = new Date('2020-01-01').getTime();

        // If we have a date in approved/published posts, use that as the base
        if (themesData && themesData.length > 0 && themesData[0].scheduled_date) {
          // Validate the date first
          const baseDate = new Date(themesData[0].scheduled_date);
          const timestamp = baseDate.getTime();
          
          if (isNaN(timestamp) || timestamp < minValidTimestamp) {
            console.warn('Invalid date found in database:', themesData[0].scheduled_date);
            // Use today as fallback
            setFurthestFutureDate(addDays(new Date(), publicationFrequency));
            return;
          }
          
          // Add the publication frequency to get the next available date
          const nextDate = addDays(baseDate, publicationFrequency);
          setFurthestFutureDate(nextDate);
        } else {
          // If no dates in approved/published posts, use today as base
          setFurthestFutureDate(addDays(new Date(), publicationFrequency));
        }
      } catch (error) {
        console.error('Error getting furthest future date:', error);
        setFurthestFutureDate(addDays(new Date(), publicationFrequency));
      }
    };

    updateFurthestDate();
  }, [currentWebsite?.id, publicationFrequency, postThemes]);
  
  // Update handleGenerateTitleSuggestions to use furthest future date
  const handleGenerateTitleSuggestions = async () => {
    if (!currentWebsite?.id || isGenerating) return;
    
    setIsGenerating(true);
    try {
      // Get current session for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('No access token found');
      }

      // Call the edge function
      const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-post-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          website_id: currentWebsite.id,
          keywords: inputValue.split(',').map(k => k.trim()).filter(Boolean),
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

      // Store categories by title
      setCategoriesByTitle(result.categoriesByTitle || {});
      console.log('API response:', result); // Add for debugging

      // Validate furthestFutureDate
      const minValidTimestamp = new Date('2020-01-01').getTime();
      let baseDate = furthestFutureDate;
      const timestamp = baseDate.getTime();
      
      // If furthestFutureDate is invalid or too old, use today instead
      if (isNaN(timestamp) || timestamp < minValidTimestamp) {
        console.warn('Using today as base date because furthestFutureDate is invalid:', baseDate);
        baseDate = new Date();
      }

      // If the backend already created post themes, just refresh our list
      if (result.postThemes && Object.keys(result.postThemes).length > 0) {
        console.log('Post themes already created by backend:', result.postThemes);
        await fetchPostThemes();
        
        // Clear input
        setInputValue('');
        
        toast.success(`Generated ${result.titles.length} content suggestions for you`);
        return;
      }

      // Legacy fallback - Create post themes for each title
      const creationPromises = result.titles.map((title, index) => {
        // Add days based on index to space out the posts
        const postDate = addDays(baseDate, index + 1);
        
        // Ensure we have valid arrays for keywords
        let safeKeywords: string[] = [];
        if (result.keywordsByTitle && result.keywordsByTitle[title]) {
          // Ensure keywords is an array of strings
          const titleKeywords = result.keywordsByTitle[title];
          safeKeywords = Array.isArray(titleKeywords) ? titleKeywords : [];
        } else if (Array.isArray(result.keywords)) {
          safeKeywords = result.keywords;
        }
        
        // Get categories for this title
        let safeCategories: { id: string; name: string }[] = [];
        if (result.categoriesByTitle && result.categoriesByTitle[title]) {
          const titleCategories = result.categoriesByTitle[title];
          if (Array.isArray(titleCategories)) {
            safeCategories = titleCategories.map(catId => {
              // If it's already an object with id/name, use it
              if (typeof catId === 'object' && catId !== null && 'id' in catId) {
                return catId as { id: string; name: string };
              }
              // Otherwise convert string ID to object
              return { id: String(catId), name: 'Category' };
            });
          }
        }
        
        return addPostTheme({
          website_id: currentWebsite.id,
          subject_matter: title,
          keywords: safeKeywords,
          categories: safeCategories,
          status: 'pending',
          scheduled_date: postDate.toISOString(),
          post_content: null,
          image: null,
          wp_post_id: null,
          wp_post_url: null,
          wp_sent_date: null
        });
      });
      
      await Promise.all(creationPromises);
      
      // Refresh the list of post themes
      await fetchPostThemes();
      
      // Clear input
      setInputValue('');
      
      toast.success(`Generated ${result.titles.length} content suggestions for you`);
    } catch (error) {
      console.error('Error generating title suggestions:', error);
      toast.error('Failed to generate title suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateTitleDate = async (id: string, newDate: Date) => {
    // Validate that newDate is actually a Date object before using it
    if (!newDate || !(newDate instanceof Date) || isNaN(newDate.getTime())) {
      console.error('Invalid date provided to handleUpdateTitleDate:', newDate);
      toast.error('Invalid date selected');
      return;
    }
    
    try {
      // Update the theme with the new date
      const success = await updatePostTheme(id, { scheduled_date: newDate.toISOString() });
      
      if (success) {
        // Refresh post themes to get updated data
        await fetchPostThemes();
        
        // Update the furthest future date if needed
        if (!currentWebsite?.id) return;
        
        toast.success('Date updated successfully');
      } else {
        toast.error('Failed to update date');
      }
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Failed to update date');
    }
  };

  const handleUpdateKeywords = async (id: string, keywords: string[]) => {
    await updatePostTheme(id, { keywords });
  };

  const handleUpdateCategories = async (id: string, categories: { id: string; name: string }[]) => {
    await updatePostTheme(id, { categories });
  };

  const handleSelectTitle = (id: string) => {
    setSelectedTitleId(id === selectedTitleId ? null : id);
  };

  const handleRemoveTitle = (id: string) => {
    // This will be handled by the TitleSuggestion component
  };

  // Update handleTitleLiked to maintain the liked post's date and update other posts
  const handleTitleLiked = async (id: string) => {
    try {
      // Get the current post's date before updating
      const postToUpdate = postThemes.find(theme => theme.id === id);
      if (!postToUpdate) return;

      // Validate the date
      let approvedDate;
      try {
        approvedDate = new Date(postToUpdate.scheduled_date);
        const timestamp = approvedDate.getTime();
        const minValidTimestamp = new Date('2020-01-01').getTime();
        
        // If we have an invalid or too old date, use today instead
        if (isNaN(timestamp) || timestamp < minValidTimestamp) {
          console.warn('Found invalid date in approved post, using today:', postToUpdate.scheduled_date);
          approvedDate = new Date();
        }
      } catch (e) {
        console.error('Error parsing date in handleTitleLiked:', e);
        approvedDate = new Date();
      }

      // Calculate new dates for pending posts based on the approved post's date
      const newBaseDate = addDays(approvedDate, publicationFrequency);

      // Update the liked post's status to approved while keeping its date
      const { error: updateError } = await supabase
        .from('post_themes')
        .update({ 
          status: 'approved',
          scheduled_date: approvedDate.toISOString() // Ensure we store a valid date
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Get all pending posts except the one being approved
      const pendingThemes = postThemes.filter(theme => 
        theme.status === 'pending' && theme.id !== id
      );

      // Update each pending post's date to be after the approved post
      const updatePromises = pendingThemes.map(theme => 
        supabase
          .from('post_themes')
          .update({ 
            scheduled_date: newBaseDate.toISOString(),
            status: 'pending'
          })
          .eq('id', theme.id)
      );

      await Promise.all(updatePromises);

      // Update local state for all posts in a single operation
      setPostThemes(prev =>
        prev.map(theme => {
          if (theme.id === id) {
            // Keep the approved post's date unchanged but ensure it's valid
            return { 
              ...theme, 
              status: 'approved',
              scheduled_date: approvedDate.toISOString()
            };
          }
          if (pendingThemes.some(pending => pending.id === theme.id)) {
            // Update pending posts' dates
            return { 
              ...theme, 
              scheduled_date: newBaseDate.toISOString(),
              status: 'pending'
            };
          }
          return theme;
        })
      );

      // Update the furthest future date
      setFurthestFutureDate(newBaseDate);

      toast.success('Post approved');
    } catch (error) {
      console.error('Error updating post status:', error);
      toast.error('Failed to update post status');
    }
  };

  // Filter suggestions based on view mode
  const filteredTitleSuggestions = postThemes
    .filter(theme => {
      if (viewMode === 'pending') {
        return theme.status === 'pending';
      } else if (viewMode === 'approved') {
        return theme.status === 'approved';
      } else if (viewMode === 'published') {
        return theme.status === 'published';
      }
      return false;
    })
    // Sort by created_at date, newest first
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(theme => {
      // Create a date object from the theme's scheduled_date
      let themeDate: Date;
      try {
        if (!theme.scheduled_date || theme.scheduled_date === '') {
          // If no date, use furthest future date for pending posts
          themeDate = theme.status === 'pending' ? furthestFutureDate : new Date();
        } else {
          themeDate = new Date(theme.scheduled_date);
          // Validate the date - if it's invalid, use a fallback
          if (isNaN(themeDate.getTime())) {
            console.warn('Invalid date in theme, using fallback:', theme.id, theme.scheduled_date);
            themeDate = theme.status === 'pending' ? furthestFutureDate : new Date();
          }
        }
      } catch (e) {
        console.error('Error parsing date:', theme.scheduled_date, e);
        themeDate = theme.status === 'pending' ? furthestFutureDate : new Date();
      }
      
      return {
        id: theme.id,
        title: theme.subject_matter,
        keywords: theme.keywords || [],
        categories: theme.categories || [],
        date: themeDate,
        status: theme.status
      };
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredTitleSuggestions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSuggestions = filteredTitleSuggestions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to first page when view mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  // Get the appropriate view title and description
  const getViewInfo = () => {
    switch (viewMode) {
      case 'pending':
        return {
          title: "Content Calendar",
          description: "Manage your content schedule and approve suggestions.",
          alertClass: "bg-yellow-50 border-yellow-200"
        };
      case 'approved':
        return {
          title: "Approved Suggestions",
          description: "These suggestions have been approved and added to your calendar.",
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
                "" : 
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
              Content Calendar
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
          {paginatedSuggestions.length > 0 && (
            <div className="grid gap-4">
              {viewMode !== 'pending' && (
                <Alert className={`mb-2 ${viewInfo.alertClass}`}>
                  <AlertDescription>
                    {viewInfo.description}
                  </AlertDescription>
                </Alert>
              )}
              {paginatedSuggestions.map((suggestion) => (
                <TitleSuggestion
                  key={suggestion.id}
                  id={suggestion.id}
                  title={suggestion.title}
                  keywords={suggestion.keywords}
                  categories={suggestion.categories}
                  selected={suggestion.id === selectedTitleId}
                  onSelect={handleSelectTitle}
                  onRemove={handleRemoveTitle}
                  date={suggestion.date}
                  onUpdateDate={(newDate) => {
                    if (newDate instanceof Date) {
                      handleUpdateTitleDate(suggestion.id, newDate);
                    } else {
                      console.error('Invalid date received from calendar:', newDate);
                    }
                  }}
                  onLiked={() => handleTitleLiked(suggestion.id)}
                  status={suggestion.status}
                  onUpdateKeywords={handleUpdateKeywords}
                  onUpdateCategories={handleUpdateCategories}
                  isGeneratingContent={isGeneratingContent(suggestion.id)}
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
      ) : paginatedSuggestions.length > 0 ? (
        <div className="grid gap-4">
          {viewMode !== 'pending' && (
            <Alert className={`mb-2 ${viewInfo.alertClass}`}>
              <AlertDescription>
                {viewInfo.description}
              </AlertDescription>
            </Alert>
          )}
          {paginatedSuggestions.map((suggestion) => (
            <TitleSuggestion
              key={suggestion.id}
              id={suggestion.id}
              title={suggestion.title}
              keywords={suggestion.keywords}
              categories={suggestion.categories}
              selected={suggestion.id === selectedTitleId}
              onSelect={handleSelectTitle}
              onRemove={handleRemoveTitle}
              date={suggestion.date}
              onUpdateDate={(newDate) => {
                if (newDate instanceof Date) {
                  handleUpdateTitleDate(suggestion.id, newDate);
                } else {
                  console.error('Invalid date received from calendar:', newDate);
                }
              }}
              onLiked={() => handleTitleLiked(suggestion.id)}
              status={suggestion.status}
              onUpdateKeywords={handleUpdateKeywords}
              onUpdateCategories={handleUpdateCategories}
              isGeneratingContent={isGeneratingContent(suggestion.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Globe className="h-8 w-8 text-muted-foreground" />}
          title={
            viewMode === 'pending' ? "No Content in Calendar" :
            viewMode === 'approved' ? "No Approved Suggestions" :
            "No Published Suggestions"
          }
          description={
            viewMode === 'pending' 
              ? "Generate title suggestions to add to your content calendar" 
              : viewMode === 'approved'
                ? "You haven't approved any suggestions yet."
                : "You haven't published any suggestions yet."
          }
          actionLabel={
            viewMode === 'pending' 
              ? "Generate Suggestions" 
              : viewMode === 'approved'
                ? "View Content Calendar"
                : "View Content Calendar"
          } 
          onAction={
            viewMode === 'pending' 
              ? handleGenerateTitleSuggestions 
              : viewMode === 'approved'
                ? () => setViewMode('pending')
                : () => setViewMode('pending')
          }
        />
      )}
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default ContentStructureView;
