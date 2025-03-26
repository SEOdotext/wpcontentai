import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWebsites } from './WebsitesContext';
import { useSettings } from './SettingsContext';
import { addDays, format } from 'date-fns';

// Define the database response type
interface PostThemeRow {
  id: string;
  website_id: string;
  subject_matter: string;
  keywords: string[];
  status: string;
  scheduled_date: string;
  created_at: string;
  updated_at: string;
  post_content: string | null;
  image: string | null;
  wp_post_id: string | null;
  wp_post_url: string | null;
  wp_sent_date: string | null;
  image_generation_error?: string | null;
}

export interface PostTheme {
  id: string;
  website_id: string;
  subject_matter: string;
  keywords: string[];
  status: 'pending' | 'generated' | 'published';
  scheduled_date: string;
  created_at: string;
  updated_at: string;
  post_content: string | null;
  image: string | null;
  wp_post_id: string | null;
  wp_post_url: string | null;
  wp_sent_date: string | null;
  image_generation_error?: string | null;
}

interface PublicationSettings {
  id: string;
  website_id: string;
  organisation_id: string;
  publication_frequency: number;
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
  getNextPublicationDate: () => Date;
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
  getNextPublicationDate: () => new Date(),
  setPostThemes: () => {},
});

export const PostThemesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [postThemes, setPostThemes] = useState<PostTheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { currentWebsite } = useWebsites();
  const { publicationFrequency } = useSettings();

  // Fetch post themes when the current website changes
  useEffect(() => {
    if (currentWebsite?.id) {
      fetchPostThemes();
    }
  }, [currentWebsite?.id]);

  // Function to get the next publication date
  const getNextPublicationDate = useCallback(() => {
    try {
      // If no website is selected, use default calculation
      if (!currentWebsite) {
        const result = addDays(new Date(), publicationFrequency);
        console.log('No website selected, using today + frequency:', format(result, 'yyyy-MM-dd'));
        return result;
      }

      // Get all themes for the current website
      const websiteThemes = postThemes.filter(theme => theme.website_id === currentWebsite.id);
      
      // Find the absolute latest date through a simple loop
      let latestTimestamp = 0;
      
      for (const theme of websiteThemes) {
        if (!theme.scheduled_date) continue;
        
        try {
          const dateObj = new Date(theme.scheduled_date);
          const timestamp = dateObj.getTime();
          
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
          }
        } catch (e) {
          console.error('Error parsing date:', theme.scheduled_date, e);
        }
      }
      
      if (latestTimestamp === 0) {
        // No valid dates found, use today + publication frequency
        const result = addDays(new Date(), publicationFrequency);
        console.log(`No valid dates found for website ${currentWebsite.name}, using today + frequency:`, format(result, 'yyyy-MM-dd'));
        return result;
      }
      
      // We found a valid latest date, add publication frequency to it
      const latestDate = new Date(latestTimestamp);
      console.log(`Found latest calendar date for website ${currentWebsite.name}:`, format(latestDate, 'yyyy-MM-dd'));
      
      const result = addDays(latestDate, publicationFrequency);
      console.log('Next publication date:', format(result, 'yyyy-MM-dd'));
      return result;
    } catch (error) {
      console.error('Error calculating next publication date:', error);
      // Fallback to today + publication frequency
      return addDays(new Date(), publicationFrequency);
    }
  }, [currentWebsite, publicationFrequency, postThemes]);

  // Function to fetch post themes from the database
  const fetchPostThemes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: themes, error: fetchError } = await supabase
        .from('post_themes')
        .select('*')
        .eq('website_id', currentWebsite.id)
        .order('scheduled_date', { ascending: true });

      console.log('Raw themes from database:', themes);
      console.log('Current website ID:', currentWebsite.id);

      if (fetchError) {
        console.error('Database fetch error:', fetchError);
        throw fetchError;
      }

      if (!themes || themes.length === 0) {
        console.log('No themes found for website:', currentWebsite.id);
      }

      const typedThemes: PostTheme[] = themes.map((theme: PostThemeRow) => ({
        id: theme.id,
        website_id: theme.website_id,
        subject_matter: theme.subject_matter,
        keywords: theme.keywords,
        post_content: theme.post_content || null,
        status: theme.status as 'pending' | 'generated' | 'published',
        scheduled_date: theme.scheduled_date,
        created_at: theme.created_at,
        updated_at: theme.updated_at,
        image: theme.image || null,
        wp_post_id: theme.wp_post_id || null,
        wp_post_url: theme.wp_post_url || null,
        wp_sent_date: theme.wp_sent_date || null,
        image_generation_error: theme.image_generation_error || undefined,
      }));

      setPostThemes(typedThemes);
    } catch (error) {
      console.error('Error fetching post themes:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch post themes'));
      toast.error('Failed to load post themes');
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
      const newTheme = {
        ...postTheme,
        website_id: currentWebsite.id,
        status: 'pending' as const,
        wp_post_id: null,
        wp_post_url: null,
        wp_sent_date: null,
        image_generation_error: undefined,
      };

      const { data, error } = await supabase
        .from('post_themes')
        .insert(newTheme)
        .select()
        .single();

      if (error) throw error;

      // Cast the data to PostThemeRow
      const rowData = data as PostThemeRow;

      // Cast to ensure status is compatible with our type
      const typedData: PostTheme = {
        id: rowData.id,
        website_id: rowData.website_id,
        subject_matter: rowData.subject_matter,
        keywords: rowData.keywords,
        post_content: rowData.post_content || null,
        status: rowData.status as 'pending' | 'generated' | 'published',
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
      
      // If we're updating the scheduled_date and it's not explicitly provided,
      // calculate the next publication date
      if (updates.status === 'generated' && !updates.scheduled_date) {
        updates.scheduled_date = getNextPublicationDate().toISOString();
        console.log('Calculated new scheduled date:', updates.scheduled_date);
      }

      // Log the exact update payload being sent to Supabase
      console.log('Sending update to Supabase:', {
        id,
        updates: {
          ...updates,
          updated_at: new Date().toISOString()
        }
      });

      const { error } = await supabase
        .from('post_themes')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      // Log the current state before update
      console.log('Current post themes state:', postThemes);

      // Update local state with all fields from updates
      setPostThemes(prev => {
        const newState = prev.map(theme => {
          if (theme.id === id) {
            const updatedTheme = {
              ...theme,
              ...updates,
              // Ensure post_content is preserved if not in updates
              post_content: updates.post_content !== undefined ? updates.post_content : theme.post_content,
              // Ensure scheduled_date is properly updated
              scheduled_date: updates.scheduled_date || theme.scheduled_date
            };
            console.log('Updating theme in state:', {
              before: theme,
              after: updatedTheme,
              updates
            });
            return updatedTheme;
          }
          return theme;
        });
        console.log('New post themes state:', newState);
        return newState;
      });
      
      // Only show toast if showToast is true
      if (showToast) {
        toast.success('Post theme updated');
      }
      
      return true;
    } catch (err) {
      console.error('Error updating post theme:', err);
      
      // Only show toast if showToast is true
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

      const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-content-v2', {
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
        post_content: rowData.post_content || null,
        status: rowData.status as 'pending' | 'generated' | 'published',
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