import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWebsites } from '@/context/WebsitesContext';

interface WordPressSettings {
  id: string;
  website_id: string;
  wp_url: string;
  wp_username: string;
  wp_application_password: string;
  is_connected: boolean;
  created_at: string;
  updated_at?: string;
}

interface WordPressContextType {
  settings: WordPressSettings | null;
  isLoading: boolean;
  initiateWordPressAuth: (wpAdminUrl: string) => void;
  completeWordPressAuth: (wpUrl: string, username: string, password: string) => Promise<boolean>;
  testConnection: () => Promise<boolean>;
  createPost: (title: string, content: string, status: 'draft' | 'publish') => Promise<boolean>;
  updatePost: (postId: number, title: string, content: string, status: 'draft' | 'publish') => Promise<boolean>;
  disconnect: () => Promise<boolean>;
}

const WordPressContext = createContext<WordPressContextType>({
  settings: null,
  isLoading: false,
  initiateWordPressAuth: () => {},
  completeWordPressAuth: async () => false,
  testConnection: async () => false,
  createPost: async () => false,
  updatePost: async () => false,
  disconnect: async () => false,
});

export const useWordPress = () => useContext(WordPressContext);

export const WordPressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<WordPressSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { currentWebsite } = useWebsites();

  // Fetch WordPress settings when website changes
  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentWebsite) {
        setSettings(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          console.log("User not authenticated");
          return;
        }

        // Fetch WordPress settings for current website
        const { data, error } = await supabase
          .from('wordpress_settings')
          .select('*')
          .eq('website_id', currentWebsite.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error;
        }

        if (data) {
          setSettings(data as WordPressSettings);
        } else {
          setSettings(null);
        }
      } catch (error) {
        console.error('Error fetching WordPress settings:', error);
        toast.error('Failed to load WordPress settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [currentWebsite]);

  // Initiate WordPress authentication by opening the application passwords page
  const initiateWordPressAuth = (wpAdminUrl: string) => {
    // Clean up the URL
    const baseUrl = wpAdminUrl.replace(/\/+$/, '');
    const appPasswordsUrl = `${baseUrl}/wp-admin/profile.php#application-passwords-section`;
    
    // Open WordPress admin in a new tab
    window.open(appPasswordsUrl, '_blank');
    
    toast.info(
      "Please follow these steps:",
      {
        description: (
          <ol className="list-decimal pl-4 mt-2 space-y-1">
            <li>Log in to your WordPress admin if needed</li>
            <li>Scroll down to "Application Passwords"</li>
            <li>Enter "WP Content AI" as the name</li>
            <li>Click "Add New Application Password"</li>
            <li>Copy the generated password</li>
            <li>Return here to complete the setup</li>
          </ol>
        ),
        duration: 10000,
      }
    );
  };

  // Complete WordPress authentication with the application password
  const completeWordPressAuth = async (wpUrl: string, username: string, password: string): Promise<boolean> => {
    if (!currentWebsite) {
      toast.error('Please select a website first');
      return false;
    }

    try {
      setIsLoading(true);

      // Test the credentials first
      const response = await fetch(`${wpUrl}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${username}:${password}`)
        }
      });

      if (!response.ok) {
        throw new Error('Invalid WordPress credentials');
      }

      // Save the credentials
      const { data, error } = await supabase
        .from('wordpress_settings')
        .upsert({
          website_id: currentWebsite.id,
          wp_url: wpUrl,
          wp_username: username,
          wp_application_password: password,
          is_connected: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setSettings(data as WordPressSettings);
        toast.success('Successfully connected to WordPress');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error saving WordPress credentials:', error);
      toast.error('Failed to connect to WordPress. Please check your credentials.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Test WordPress connection
  const testConnection = async (): Promise<boolean> => {
    if (!settings) {
      toast.error('WordPress is not configured');
      return false;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${settings.wp_url}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${settings.wp_username}:${settings.wp_application_password}`)
        }
      });

      if (!response.ok) {
        throw new Error('Failed to connect to WordPress');
      }

      toast.success('Successfully connected to WordPress');
      return true;
    } catch (error) {
      console.error('Error testing WordPress connection:', error);
      toast.error('Failed to connect to WordPress. Please check your credentials.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new WordPress post
  const createPost = async (
    title: string,
    content: string,
    status: 'draft' | 'publish'
  ): Promise<boolean> => {
    if (!settings) {
      toast.error('WordPress is not configured');
      return false;
    }

    try {
      const response = await fetch(`${settings.wp_url}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${settings.wp_username}:${settings.wp_application_password}`)
        },
        body: JSON.stringify({
          title,
          content,
          status
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create WordPress post');
      }

      toast.success(`Post ${status === 'publish' ? 'published' : 'saved as draft'} successfully`);
      return true;
    } catch (error) {
      console.error('Error creating WordPress post:', error);
      toast.error('Failed to create WordPress post');
      return false;
    }
  };

  // Update an existing WordPress post
  const updatePost = async (
    postId: number,
    title: string,
    content: string,
    status: 'draft' | 'publish'
  ): Promise<boolean> => {
    if (!settings) {
      toast.error('WordPress is not configured');
      return false;
    }

    try {
      const response = await fetch(`${settings.wp_url}/wp-json/wp/v2/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${settings.wp_username}:${settings.wp_application_password}`)
        },
        body: JSON.stringify({
          title,
          content,
          status
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update WordPress post');
      }

      toast.success(`Post ${status === 'publish' ? 'published' : 'saved as draft'} successfully`);
      return true;
    } catch (error) {
      console.error('Error updating WordPress post:', error);
      toast.error('Failed to update WordPress post');
      return false;
    }
  };

  // Disconnect WordPress integration
  const disconnect = async (): Promise<boolean> => {
    if (!settings) return true;

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('wordpress_settings')
        .delete()
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(null);
      toast.success('WordPress disconnected successfully');
      return true;
    } catch (error) {
      console.error('Error disconnecting WordPress:', error);
      toast.error('Failed to disconnect WordPress');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WordPressContext.Provider
      value={{
        settings,
        isLoading,
        initiateWordPressAuth,
        completeWordPressAuth,
        testConnection,
        createPost,
        updatePost,
        disconnect
      }}
    >
      {children}
    </WordPressContext.Provider>
  );
}; 