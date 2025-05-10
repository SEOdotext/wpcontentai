import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWebsites } from './WebsitesContext';
import { useSettings } from './SettingsContext';
import { addDays, format } from 'date-fns';
import { createDayCountMap, createExistingPostsMap, findNextAvailableDate, formatScheduledDate, isWeeklyScheduleFilled } from '@/utils/dates';

/**
 * IMPORTANT: Centralized Date Calculation
 * 
 * This context provides the centralized getNextPublicationDate function that should be used
 * consistently throughout the app for all date calculations. This ensures we have consistent
 * date logic for the Content Calendar.
 * 
 * The function considers all relevant post statuses (published, approved, generated, textgenerated, etc.)
 * except "pending" and "declined" when determining the furthest future date.
 * 
 * Do not implement custom date calculation logic in components.
 */

// Define the database response type
interface PostThemeRow {
  id: string;
  website_id: string;
  subject_matter: string;
  keywords: string[];
  status: string;
  scheduled_date?: string | null;
  created_at: string;
  updated_at: string;
  post_content: string | null;
  image: string | null;
  wp_post_id: string | null;
  wp_post_url: string | null;
  wp_sent_date: string | null;
  image_generation_error?: string | null;
  // Add categories relation
  categories?: WordPressCategory[];
  image_id?: string | null;
}

interface WordPressCategory {
  id: string;
  name: string;
}

export interface PostTheme {
  id: string;
  website_id: string;
  subject_matter: string;
  keywords: string[];
  status: 'pending' | 'approved' | 'published' | 'textgenerated' | 'generated' | 'declined' | 'generatingidea';
  scheduled_date?: string | null;
  created_at: string;
  updated_at: string;
  post_content: string | null;
  image: string | null;
  wp_post_id: string | null;
  wp_post_url: string | null;
  wp_sent_date: string | null;
  image_generation_error?: string | null;
  categories: WordPressCategory[];
  image_id?: string | null;
}

interface PublicationSettings {
  id: string;
  website_id: string;
  organisation_id: string;
  posting_frequency: number;
  writing_style: string;
  subject_matters: any; // Using any for now since we don't have the Json type
  format_template: string;
  created_at: string;
  updated_at: string;
}

interface PostThemeCategoryResponse {
  post_theme_id: string;
  wordpress_category: {
    id: string;
    name: string;
  } | null;
}

interface ImageMapItem {
  id: string;
  url: string;
  name: string;
  description?: string;
}

interface PostThemesContextType {
  postThemes: PostTheme[];
  isLoading: boolean;
  error: Error | null;
  fetchPostThemes: () => Promise<void>;
  addPostTheme: (postTheme: Omit<PostTheme, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updatePostTheme: (id: string, updates: Partial<PostTheme>, showToast?: boolean) => Promise<boolean>;
  deletePostTheme: (id: string) => Promise<boolean>;
  generateContent: (id: string) => Promise<PostTheme>;
  sendToWordPress: (id: string) => Promise<boolean>;
  isGeneratingContent: (id: string) => boolean;
  getNextPublicationDate: () => Promise<Date>;
  checkWeeklySchedule: () => Promise<{ isFilled: boolean; missingSlots: { date: Date; count: number }[] }>;
  setPostThemes: React.Dispatch<React.SetStateAction<PostTheme[]>>;
  imageMap: Record<string, ImageMapItem>;
  fetchImagesForWebsite: (websiteId: string) => Promise<void>;
}

export const PostThemesContext = createContext<PostThemesContextType>({
  postThemes: [],
  isLoading: false,
  error: null,
  fetchPostThemes: async () => {},
  addPostTheme: async () => false,
  updatePostTheme: async () => false,
  deletePostTheme: async () => false,
  generateContent: async () => { throw new Error('Not implemented'); },
  sendToWordPress: async () => false,
  isGeneratingContent: () => false,
  getNextPublicationDate: async () => new Date(),
  checkWeeklySchedule: async () => ({ isFilled: false, missingSlots: [] }),
  setPostThemes: () => {},
  imageMap: {},
  fetchImagesForWebsite: async () => {},
});

export const PostThemesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [postThemes, setPostThemes] = useState<PostTheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { currentWebsite } = useWebsites();
  const { } = useSettings();
  const [imageMap, setImageMap] = useState<Record<string, ImageMapItem>>({});

  // Fetch post themes when the current website changes
  useEffect(() => {
    if (currentWebsite?.id) {
      fetchPostThemes();
    }
  }, [currentWebsite?.id]);

  // Helper function to count posts for a specific date
  const countPostsForDate = (posts: PostTheme[], dateStr: string): number => {
    return posts.filter(post => {
      if (!post.scheduled_date) return false;
      try {
        const postDate = format(new Date(post.scheduled_date), 'yyyy-MM-dd');
        return postDate === dateStr && post.status !== 'declined' && post.status !== 'pending';
      } catch (e) {
        console.error('Error parsing date in countPostsForDate:', e, post);
        return false;
      }
    }).length;
  };

  // Function to get the next publication date
  const getNextPublicationDate = useCallback(async () => {
    if (!currentWebsite) {
      console.log('No current website selected');
      return new Date(); // Default to today if no website
    }

    try {
      // First check content calendar for existing posts
      const existingPostsByDate = createExistingPostsMap(postThemes);
      
      // Get publication settings
      const { data: settings, error: settingsError } = await supabase
        .from('publication_settings')
        .select('*')
        .eq('website_id', currentWebsite.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (settingsError) {
        console.error('Error fetching publication settings:', settingsError);
        return new Date(); // Default to today on error
      }

      // Create day count map from settings if available
      const dayCountMap = settings?.[0]?.posting_days?.length > 0 
        ? createDayCountMap(settings[0].posting_days)
        : { monday: 1, wednesday: 1, friday: 1 }; // Default schedule if no settings

      console.log('Day count map:', dayCountMap);

      // Get all active posts (not pending or declined)
      const activePosts = postThemes.filter(p => 
        p.scheduled_date && 
        p.status !== 'declined' && 
        p.status !== 'pending'
      );

      // Find the latest scheduled date from active posts
      let currentDate = new Date();
      if (activePosts.length > 0) {
        const latestDate = new Date(Math.max(
          ...activePosts
            .map(p => new Date(p.scheduled_date || 0).getTime())
            .filter(time => !isNaN(time))
        ));
        
        // If latest date is valid and in the future, use it as starting point
        if (!isNaN(latestDate.getTime()) && latestDate > currentDate) {
          currentDate = latestDate;
        }
      }

      // Set to start of day for consistent comparison
      currentDate.setHours(0, 0, 0, 0);
      
      // Look for next available slot
      let maxAttempts = 28; // 4 weeks safety limit
      while (maxAttempts > 0) {
        const dayName = format(currentDate, 'EEEE').toLowerCase();
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const existingPostsForDay = countPostsForDate(postThemes, dateStr);

        console.log('Checking date:', {
          date: dateStr,
          dayName,
          isPostingDay: !!dayCountMap[dayName],
          existingPostsForDay,
          maxPostsForDay: dayCountMap[dayName],
          activeStatuses: postThemes
            .filter(p => p.scheduled_date && format(new Date(p.scheduled_date), 'yyyy-MM-dd') === dateStr)
            .map(p => p.status)
        });

        if (dayCountMap[dayName] && existingPostsForDay < dayCountMap[dayName]) {
          console.log(`Found available slot on ${dayName}, ${dateStr}`);
          return currentDate;
        }

        currentDate = addDays(currentDate, 1);
        maxAttempts--;
      }

      // If no suitable date found within 4 weeks, default to tomorrow
      const tomorrow = addDays(new Date(), 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;

    } catch (error) {
      console.error('Error calculating next publication date:', error);
      // Default to tomorrow on error
      const tomorrow = addDays(new Date(), 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }
  }, [currentWebsite, postThemes]);

  // Function to fetch post themes from the database
  const fetchPostThemes = async () => {
    try {
      if (!currentWebsite?.id) {
        console.log('No current website selected, skipping post themes fetch');
        return;
      }

      setIsLoading(true);
      setError(null);

      // Fetch post themes
      const { data: themes, error: themesError } = await supabase
        .from('post_themes')
        .select('*')
        .eq('website_id', currentWebsite.id)
        .order('created_at', { ascending: false });

      if (themesError) {
        handleError(themesError, 'Error fetching post themes');
        return;
      }

      if (!themes) {
        setPostThemes([]);
        return;
      }

      // Find the latest publication date from active posts
      const latestDate = themes
        .filter(p => p.scheduled_date && p.status !== 'declined' && p.status !== 'pending')
        .reduce((latest, post) => {
          const postDate = new Date(post.scheduled_date!);
          return postDate > latest ? postDate : latest;
        }, new Date(0));

      // Process themes in chunks to avoid URL length limits
      const CHUNK_SIZE = 50;
      const categoriesByTheme = new Map<string, WordPressCategory[]>();
      
      for (let i = 0; i < themes.length; i += CHUNK_SIZE) {
        const chunk = themes.slice(i, i + CHUNK_SIZE);
        const themeIds = chunk.map(theme => theme.id);
        
        const { data: categories, error: categoriesError } = await supabase
          .from('post_theme_categories')
          .select(`
            post_theme_id,
            wordpress_category:wordpress_category_id (
              id,
              name
            )
          `)
          .in('post_theme_id', themeIds) as { data: PostThemeCategoryResponse[] | null, error: any };

        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
          continue; // Skip this chunk but continue with others
        }

        if (categories) {
          categories.forEach(cat => {
            if (!categoriesByTheme.has(cat.post_theme_id)) {
              categoriesByTheme.set(cat.post_theme_id, []);
            }
            if (cat.wordpress_category) {
              const categoryArray = categoriesByTheme.get(cat.post_theme_id);
              if (categoryArray) {
                categoryArray.push({
                  id: cat.wordpress_category.id,
                  name: cat.wordpress_category.name
                });
              }
            }
          });
        }
      }

      // Combine themes with their categories
      const themesWithCategories = themes.map(theme => ({
        ...theme,
        categories: categoriesByTheme.get(theme.id) || [],
        scheduled_date: formatScheduledDate(theme.scheduled_date)
      }));

      setPostThemes(themesWithCategories);

      // Update any pending posts with the next available date
      const pendingPosts = themesWithCategories.filter(p => p.status === 'pending');
      if (pendingPosts.length > 0) {
        const nextDate = await getNextPublicationDate();
        const formattedDate = new Date(nextDate);
        formattedDate.setHours(0, 0, 0, 0);
        const dateString = formattedDate.toISOString();

        // Update pending posts with the next available date
        setPostThemes(prev => prev.map(theme => 
          theme.status === 'pending'
            ? { ...theme, scheduled_date: dateString }
            : theme
        ));
      }
    } catch (err) {
      handleError(err, 'Error in fetchPostThemes');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to add a new post theme
  const addPostTheme = async (postTheme: Omit<PostTheme, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    if (!currentWebsite?.id) {
      toast.error('No website selected');
      return false;
    }

    try {
      // Extract categories from the postTheme object
      const { categories, ...themeData } = postTheme;
      
      const newTheme = {
        ...themeData,
        website_id: currentWebsite.id,
        status: 'pending' as const,
        wp_post_id: null,
        wp_post_url: null,
        wp_sent_date: null,
        image_generation_error: undefined,
      };

      // Insert the post theme first
      const { data, error } = await supabase
        .from('post_themes')
        .insert(newTheme)
        .select()
        .single();

      if (error) throw error;

      // If we have categories, insert them into the junction table
      if (categories && categories.length > 0) {
        const { error: categoryError } = await supabase
          .from('post_theme_categories')
          .insert(
            categories.map(cat => ({
              post_theme_id: data.id,
              wordpress_category_id: cat.id
            }))
          );

        if (categoryError) throw categoryError;
      }

      // Cast the data to PostThemeRow
      const rowData = data as PostThemeRow;

      // Cast to ensure status is compatible with our type
      const typedData: PostTheme = {
        id: rowData.id,
        website_id: rowData.website_id,
        subject_matter: rowData.subject_matter,
        keywords: rowData.keywords,
        categories: categories || [],
        post_content: rowData.post_content || null,
        status: rowData.status as 'pending' | 'approved' | 'published' | 'textgenerated' | 'generated' | 'declined' | 'generatingidea',
        scheduled_date: rowData.scheduled_date,
        created_at: rowData.created_at,
        updated_at: rowData.updated_at,
        image: rowData.image || null,
        wp_post_id: rowData.wp_post_id || null,
        wp_post_url: rowData.wp_post_url || null,
        wp_sent_date: rowData.wp_sent_date || null,
        image_generation_error: rowData.image_generation_error || undefined,
        image_id: rowData.image_id || undefined,
      };
      
      setPostThemes(prev => [...prev, typedData]);
      toast.success(`Post theme for "${typedData.subject_matter}" created`);
      return true;
    } catch (err) {
      console.error('Error creating post theme:', err);
      toast.error(`Failed to create post theme for "${postTheme.subject_matter}"`);
      return false;
    }
  };

  // Function to update a post theme
  const updatePostTheme = async (id: string, updates: Partial<PostTheme>, showToast: boolean = true): Promise<boolean> => {
    try {
      console.log('Updating post theme:', { id, updates });
      
      // Ensure keywords is always an array if it's being updated
      if (updates.keywords !== undefined) {
        updates.keywords = Array.isArray(updates.keywords) ? updates.keywords : [];
      }
      
      // Ensure categories is always an array if it's being updated
      if (updates.categories !== undefined) {
        updates.categories = Array.isArray(updates.categories) ? updates.categories : [];
      }
      
      // Handle category updates separately
      if (updates.categories) {
        const { categories, ...otherUpdates } = updates;
        
        // Delete existing category links
        const { error: deleteError } = await supabase
          .from('post_theme_categories')
          .delete()
          .eq('post_theme_id', id);

        if (deleteError) throw deleteError;

        // Insert new category links
        if (categories.length > 0) {
          const { error: insertError } = await supabase
            .from('post_theme_categories')
            .insert(
              categories.map(cat => ({
                post_theme_id: id,
                wordpress_category_id: cat.id
              }))
            );

          if (insertError) throw insertError;
        }

        // Continue with other updates if any
        if (Object.keys(otherUpdates).length > 0) {
          const { error } = await supabase
            .from('post_themes')
            .update(otherUpdates)
            .eq('id', id);

          if (error) throw error;
        }
      } else {
        // Handle non-category updates
        const { error } = await supabase
          .from('post_themes')
          .update(updates)
          .eq('id', id);

        if (error) throw error;
      }

      // Update local state instead of fetching
      setPostThemes(prev => prev.map(theme => 
        theme.id === id 
          ? { ...theme, ...updates }
          : theme
      ));

      if (showToast) {
        toast.success('Post theme updated');
      }

      return true;
    } catch (err) {
      console.error('Error updating post theme:', err);
      if (showToast) {
        toast.error('Failed to update post theme');
      }
      return false;
    }
  };

  // Function to delete a post theme
  const deletePostTheme = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('post_themes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPostThemes(prev => prev.filter(theme => theme.id !== id));
      toast.success('Post theme deleted');
      return true;
    } catch (err) {
      console.error('Error deleting post theme:', err);
      toast.error('Failed to delete post theme');
      return false;
    }
  };

  // Function to generate content for a post theme
  const generateContent = async (postThemeId: string): Promise<PostTheme> => {
    try {
      // Set loading state for this specific post theme
      setLoadingStates(prev => ({ ...prev, [postThemeId]: true }));
      setError(null);

      // Call the Edge Function to generate content
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No access token found');

      const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-content-v3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ postThemeId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate content');
      }

      // Wait for a short time to allow the database to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the status to 'textgenerated' to indicate that text content has been generated
      await supabase
        .from('post_themes')
        .update({ status: 'textgenerated' })
        .eq('id', postThemeId);

      // Fetch the updated post theme from the database
      const { data: updatedTheme, error: fetchError } = await supabase
        .from('post_themes')
        .select('*')
        .eq('id', postThemeId)
        .single();

      if (fetchError) throw fetchError;
      if (!updatedTheme) throw new Error('Post theme not found');

      // Cast the data to PostThemeRow
      const rowData = updatedTheme as PostThemeRow;

      // Map post_content to content for components that expect it
      const typedUpdatedTheme: PostTheme = {
        id: rowData.id,
        website_id: rowData.website_id,
        subject_matter: rowData.subject_matter,
        keywords: rowData.keywords,
        categories: rowData.categories || [],
        post_content: rowData.post_content || null,
        status: rowData.status as 'pending' | 'approved' | 'published' | 'textgenerated' | 'generated' | 'declined' | 'generatingidea',
        scheduled_date: rowData.scheduled_date,
        created_at: rowData.created_at,
        updated_at: rowData.updated_at,
        image: rowData.image || null,
        wp_post_id: rowData.wp_post_id || null,
        wp_post_url: rowData.wp_post_url || null,
        wp_sent_date: rowData.wp_sent_date || null,
        image_generation_error: rowData.image_generation_error || undefined,
        image_id: rowData.image_id || undefined,
      };

      setPostThemes(prev => 
        prev.map(theme => 
          theme.id === postThemeId 
            ? typedUpdatedTheme
            : theme
        )
      );

      return typedUpdatedTheme;
    } catch (error) {
      console.error('Error generating content:', error);
      setError(error instanceof Error ? error : new Error('Failed to generate content'));
      throw error;
    } finally {
      // Clear loading state for this specific post theme
      setLoadingStates(prev => ({ ...prev, [postThemeId]: false }));
    }
  };

  // Helper function to check if a specific post theme is being generated
  const isGeneratingContent = (id: string): boolean => {
    return loadingStates[id] || false;
  };

  // Function to send a post theme to WordPress
  const sendToWordPress = async (id: string): Promise<boolean> => {
    try {
      const theme = postThemes.find(t => t.id === id);
      if (!theme) {
        toast.error('Post theme not found');
        return false;
      }

      if (!theme.post_content) {
        toast.error('No content to send to WordPress');
        return false;
      }

      // Check if the theme has already been sent to WordPress
      if (theme.wp_post_url) {
        toast.error('This post has already been sent to WordPress');
        return false;
      }

      // Call the WordPress integration function with minimal data
      const { data, error: wpError } = await supabase.functions.invoke('wordpress-posts', {
        body: {
          website_id: theme.website_id,
          post_theme_id: theme.id,
          action: 'create'
        }
      });

      if (wpError) throw wpError;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send to WordPress');
      }

      // Update the post theme with WordPress information
      const { error: updateError } = await supabase
        .from('post_themes')
        .update({
          status: 'published',
          wp_post_id: data.post.id,
          wp_post_url: data.post.url,
          wp_sent_date: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state
      setPostThemes(prev =>
        prev.map(t => t.id === id
          ? {
              ...t,
              status: 'published',
              wp_post_id: data.post.id,
              wp_post_url: data.post.url,
              wp_sent_date: new Date().toISOString()
            }
          : t
        )
      );

      toast.success('Content sent to WordPress successfully');
      return true;
    } catch (err) {
      console.error('Error sending to WordPress:', err);
      toast.error('Failed to send content to WordPress');
      return false;
    }
  };

  // Update handleTitleLiked to properly handle date timezone
  const handleTitleLiked = async (id: string) => {
    try {
      // Get the post being approved
      const postToUpdate = postThemes.find(theme => theme.id === id);
      if (!postToUpdate) return;

      // Get the next available publication date
          const nextDate = await getNextPublicationDate();
      console.log('Setting next publication date:', nextDate);

      // Format the date to ensure consistent timezone handling
      const formattedDate = new Date(nextDate);
      formattedDate.setHours(0, 0, 0, 0); // Set to start of day
      const dateString = formattedDate.toISOString();
      console.log('Formatted date string:', dateString);

      // Update local state first
      setPostThemes(prev => prev.map(theme => 
        theme.id === id 
          ? { ...theme, status: 'approved', scheduled_date: dateString }
          : theme
      ));

      // Then update database
      const { error: updateError } = await supabase
        .from('post_themes')
        .update({ 
        status: 'approved',
          scheduled_date: dateString
        })
        .eq('id', id);

      if (updateError) {
        // Revert local state if database update fails
        setPostThemes(prev => prev.map(theme => 
          theme.id === id 
            ? { ...theme, status: 'pending', scheduled_date: null }
            : theme
        ));
        throw updateError;
      }

      toast.success('Post approved and scheduled');
    } catch (error) {
      console.error('Error updating post status:', error);
      toast.error('Failed to update post status');
    }
  };

  // Update error handling
  const handleError = (err: unknown, message: string) => {
    console.error(message, err);
    setError(err instanceof Error ? err : new Error(message));
  };

  // Function to check weekly schedule status
  const checkWeeklySchedule = useCallback(async () => {
    if (!currentWebsite) {
      console.log('No current website selected');
      return { isFilled: false, missingSlots: [] };
    }

    try {
      // Get publication settings
      const { data: settings, error: settingsError } = await supabase
        .from('publication_settings')
        .select('*')
        .eq('website_id', currentWebsite.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (settingsError) {
        console.error('Error fetching publication settings:', settingsError);
        return { isFilled: false, missingSlots: [] };
      }

      // Create day count map from settings if available
      const dayCountMap = settings?.[0]?.posting_days?.length > 0 
        ? createDayCountMap(settings[0].posting_days)
        : { monday: 1, wednesday: 1, friday: 1 }; // Default schedule if no settings

      return isWeeklyScheduleFilled(dayCountMap, postThemes);
    } catch (error) {
      console.error('Error checking weekly schedule:', error);
      return { isFilled: false, missingSlots: [] };
    }
  }, [currentWebsite, postThemes]);

  const fetchImagesForWebsite = async (websiteId: string) => {
    const { data, error } = await supabase
      .from('images')
      .select('id, url, name, description')
      .eq('website_id', websiteId);
    if (!error && data) {
      const map: Record<string, ImageMapItem> = {};
      data.forEach(img => { map[img.id] = img; });
      setImageMap(map);
    }
  };

  // Create the context value
  const contextValue: PostThemesContextType = {
    postThemes,
    isLoading,
    error,
    fetchPostThemes,
    addPostTheme,
    updatePostTheme,
    deletePostTheme,
    generateContent,
    sendToWordPress,
    isGeneratingContent,
    getNextPublicationDate,
    checkWeeklySchedule,
    setPostThemes,
    imageMap,
    fetchImagesForWebsite
  };

  return (
    <PostThemesContext.Provider value={contextValue}>
      {children}
    </PostThemesContext.Provider>
  );
};

// Create a custom hook to use the context
export const usePostThemes = () => useContext(PostThemesContext); 