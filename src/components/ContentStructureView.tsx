import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Plus, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TitleSuggestion from './TitleSuggestion';
import EmptyState from './EmptyState';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { useSettings } from '@/context/SettingsContext';
import { usePostThemes } from '@/context/PostThemesContext';
import { useWebsites } from '@/context/WebsitesContext';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/types/supabase';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import GeneratePostIdeasFromImages from './GeneratePostIdeasFromImages';

/**
 * IMPORTANT: Date Calculation
 * 
 * All date calculations in this component use the centralized getNextPublicationDate function
 * from PostThemesContext. This ensures consistent date logic throughout the application.
 * 
 * Do not implement custom date calculation logic or manage separate date state.
 * Always use getNextPublicationDate for determining the next publication date.
 */

type PostTheme = Tables['post_themes']['Row'] & {
  categories: { id: string; name: string }[];
  status: 'pending' | 'approved' | 'published' | 'generated' | 'declined' | 'generatingidea' | 'textgenerated';
  image_id?: string | null;
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
  status: 'pending' | 'approved' | 'published' | 'generated' | 'declined' | 'generatingidea' | 'textgenerated';
  onUpdateKeywords?: (id: string, keywords: string[]) => void;
  onUpdateCategories?: (id: string, categories: { id: string; name: string }[]) => void;
  isGeneratingContent?: boolean;
  image?: { url: string; name: string } | null;
  onSelectImage?: (imageId: string) => void;
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
  const { subjectMatters, writingStyle } = useSettings();
  const { currentWebsite } = useWebsites();
  const { 
    postThemes, 
    isLoading: themesLoading, 
    fetchPostThemes, 
    addPostTheme,
    updatePostTheme,
    isGeneratingContent,
    getNextPublicationDate,
    setPostThemes,
    imageMap,
    fetchImagesForWebsite
  } = usePostThemes();
  
  // Add categoriesByTitle state
  const [categoriesByTitle, setCategoriesByTitle] = useState<{ [title: string]: { id: string; name: string }[] }>({});
  
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
            subject_matters: topics,
            count: 3 // Generate 3 initial posts
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
  
  // Update handleGenerateTitleSuggestions to use getNextPublicationDate directly
  const handleGenerateTitleSuggestions = async () => {
    if (!currentWebsite?.id || isGenerating) return;
    
    setIsGenerating(true);
    try {
      // Get current session for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        console.error('No access token found');
        toast.error('Please log in to generate content');
        return;
      }

      // Prepare keywords from input
      const keywords = inputValue.split(',').map(k => k.trim()).filter(Boolean);
      if (keywords.length === 0 && inputValue.trim() !== '') {
        console.error('Invalid keywords format');
        toast.error('Please enter valid keywords separated by commas');
        return;
      }

      console.log('Generating title suggestions with:', {
        websiteId: currentWebsite.id,
        keywords,
        writingStyle: writingStyle || 'default',
        subjectMatters: subjectMatters || [],
        language: currentWebsite.language || 'en'
      });

      // Call the edge function
      const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-post-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          website_id: currentWebsite.id,
          keywords,
          writing_style: writingStyle || 'default',
          subject_matters: subjectMatters || [],
          language: currentWebsite.language || 'en'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from generate-post-ideas:', errorData);
        throw new Error(errorData.error || 'Failed to generate title suggestions');
      }

      const result = await response.json();
      if (!result.success) {
        console.error('Unsuccessful result from generate-post-ideas:', result);
        throw new Error(result.error || 'Failed to generate title suggestions');
      }

      // Store categories by title
      setCategoriesByTitle(result.categoriesByTitle || {});
      console.log('API response:', result);

      // Validate baseDate using getNextPublicationDate
      const minValidTimestamp = new Date('2020-01-01').getTime();
      let baseDate = await getNextPublicationDate();
      const timestamp = baseDate.getTime();
      
      // If baseDate is invalid or too old, use today instead
      if (isNaN(timestamp) || timestamp < minValidTimestamp) {
        console.warn('Using today as base date because calculation returned invalid date:', baseDate);
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

      // Create post themes for each title
      const creationPromises = result.titles.map(title => {
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
      toast.error(error instanceof Error ? error.message : 'Failed to generate title suggestions');
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

  const handleRemoveTitle = useCallback((id: string) => {
    setPostThemes(prev => prev.filter(theme => theme.id !== id));
  }, [setPostThemes]);

  // Update handleTitleLiked to only handle status change
  const handleTitleLiked = async (id: string) => {
    try {
      // Get the current post
      const postToUpdate = postThemes.find(theme => theme.id === id);
      if (!postToUpdate) return;

      // Update just the status - the date is handled in TitleSuggestion component
      const success = await updatePostTheme(id, {
        status: 'approved'
      });

      if (!success) {
        throw new Error('Failed to update post theme');
      }

      // Refresh post themes to get the latest data
      await fetchPostThemes();

    } catch (error) {
      console.error('Error updating post status:', error);
      toast.error('Failed to update post status');
      // Refresh post themes to ensure state is consistent
      await fetchPostThemes();
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
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

  useEffect(() => {
    if (currentWebsite?.id) {
      fetchImagesForWebsite(currentWebsite.id);
    }
  }, [currentWebsite?.id]);

  const handleSelectImage = async (id: string, imageId: string) => {
    try {
      const success = await updatePostTheme(id, { 
        image_id: imageId
      });
      
      if (success) {
        // Refresh post themes to get updated data
        await fetchPostThemes();
        toast.success('Image selected');
      } else {
        toast.error('Failed to select image');
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      toast.error('Failed to select image');
    }
  };

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
        <Tabs defaultValue="subjects" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="subjects" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span>Generate from Subjects</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>Generate from Media</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subjects">
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
          </TabsContent>

          <TabsContent value="media">
            <GeneratePostIdeasFromImages
              currentWebsite={currentWebsite ? {
                id: currentWebsite.id,
                language: currentWebsite.language || 'en'
              } : null}
              writingStyle={writingStyle}
              subjectMatters={subjectMatters}
              onContentGenerated={fetchPostThemes}
            />
          </TabsContent>
        </Tabs>
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
              {paginatedSuggestions.map((suggestion) => {
                let themeDate: Date;
                try {
                  themeDate = suggestion.scheduled_date ? new Date(suggestion.scheduled_date) : new Date();
                } catch {
                  themeDate = new Date();
                }
                return (
                  <div key={suggestion.id} className="w-full">
                    <TitleSuggestion
                      id={suggestion.id}
                      title={suggestion.subject_matter}
                      keywords={suggestion.keywords}
                      categories={suggestion.categories}
                      selected={suggestion.id === selectedTitleId}
                      onSelect={handleSelectTitle}
                      onRemove={handleRemoveTitle}
                      className="mb-1"
                      date={themeDate}
                      onUpdateDate={date => handleUpdateTitleDate(suggestion.id, date)}
                      onLiked={() => handleTitleLiked(suggestion.id)}
                      status={suggestion.status}
                      onUpdateKeywords={handleUpdateKeywords}
                      onUpdateCategories={handleUpdateCategories}
                      isGeneratingContent={isGeneratingContent(suggestion.id)}
                      image={suggestion.image_id && imageMap[suggestion.image_id] ? {
                        url: imageMap[suggestion.image_id].url,
                        name: imageMap[suggestion.image_id].name
                      } : null}
                      onSelectImage={(imageId) => handleSelectImage(suggestion.id, imageId)}
                    />
                  </div>
                );
              })}
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
          {paginatedSuggestions.map((suggestion) => {
            let themeDate: Date;
            try {
              themeDate = suggestion.scheduled_date ? new Date(suggestion.scheduled_date) : new Date();
            } catch {
              themeDate = new Date();
            }
            return (
              <div key={suggestion.id} className="w-full">
                <TitleSuggestion
                  id={suggestion.id}
                  title={suggestion.subject_matter}
                  keywords={suggestion.keywords}
                  categories={suggestion.categories}
                  selected={suggestion.id === selectedTitleId}
                  onSelect={handleSelectTitle}
                  onRemove={handleRemoveTitle}
                  className="mb-1"
                  date={themeDate}
                  onUpdateDate={date => handleUpdateTitleDate(suggestion.id, date)}
                  onLiked={() => handleTitleLiked(suggestion.id)}
                  status={suggestion.status}
                  onUpdateKeywords={handleUpdateKeywords}
                  onUpdateCategories={handleUpdateCategories}
                  isGeneratingContent={isGeneratingContent(suggestion.id)}
                  image={suggestion.image_id && imageMap[suggestion.image_id] ? {
                    url: imageMap[suggestion.image_id].url,
                    name: imageMap[suggestion.image_id].name
                  } : null}
                  onSelectImage={(imageId) => handleSelectImage(suggestion.id, imageId)}
                />
              </div>
            );
          })}
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
