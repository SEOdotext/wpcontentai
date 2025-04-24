import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWebsites } from './WebsitesContext';
import { useSettings } from './SettingsContext';
import { addDays, format } from 'date-fns';
import { createDayCountMap, createExistingPostsMap, findNextAvailableDate, formatScheduledDate } from '@/utils/dates';

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
  categories: { id: string; name: string }[];
}

interface PublicationSettings {
  id: string;
  website_id: string;
  organisation_id: string;
  posting_frequency: number;
  writing_style: string;
  subject_matters: any; // Using any for now since we don't have the Json type
  wordpress_template: string;
  created_at: string;
  updated_at: string;
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
  setPostThemes: React.Dispatch<React.SetStateAction<PostTheme[]>>;
}

const PostThemesContext = createContext<PostThemesContextType>({
  postThemes: [],
  isLoading: false,
  error: null,
  fetchPostThemes: async () => {},
  addPostTheme: async () => false,
  updatePostTheme: async () => false,
  deletePostTheme: async () => false,
  generateContent: async () => { throw new Error('Method not implemented'); },
  sendToWordPress: async () => false,
  isGeneratingContent: () => false,
  getNextPublicationDate: async () => new Date(),
  setPostThemes: () => {},
});

export const PostThemesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [postThemes, setPostThemes] = useState<PostTheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { currentWebsite } = useWebsites();
  const { } = useSettings();

  // Fetch post themes when the current website changes
  useEffect(() => {
    if (currentWebsite?.id) {
      fetchPostThemes();
    }
  }, [currentWebsite?.id]);

  // Function to get the next publication date
  const getNextPublicationDate = useCallback(async () => {
    if (!currentWebsite) {
      console.log('No current website selected');
      return addDays(new Date(), 1);
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
        return addDays(new Date(), 1);
      }

      if (!settings || settings.length === 0 || !settings[0].posting_days || settings[0].posting_days.length === 0) {
        console.log('No publication settings found, using default (tomorrow)');
        return addDays(new Date(), 1);
      }

      const dayCountMap = createDayCountMap(settings[0].posting_days);
      console.log('Day count map:', dayCountMap);

      const existingPostsByDate = createExistingPostsMap(postThemes);
      return findNextAvailableDate(dayCountMap, postThemes, existingPostsByDate);

    } catch (error) {
      console.error('Error calculating next publication date:', error);
      return addDays(new Date(), 1);
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
      const categoriesByTheme = new Map<string, Array<{ id: string; name: string }>>();
      
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
          .in('post_theme_id', themeIds);

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
              categoriesByTheme.get(cat.post_theme_id)?.push({
                id: cat.wordpress_category.id,
                name: cat.wordpress_category.name
              });
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
    setPostThemes
  };

  return (
    <PostThemesContext.Provider value={contextValue}>
      {children}
    </PostThemesContext.Provider>
  );
};

// Create a custom hook to use the context
export const usePostThemes = () => useContext(PostThemesContext); 