import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWebsites } from '@/context/WebsitesContext';
import { generateImage } from '@/services/imageGeneration';

interface WordPressSettings {
  id: string;
  website_id: string;
  wp_url: string;
  wp_username: string;
  wp_application_password: string;
  is_connected: boolean;
  created_at: string;
  updated_at: string;
  publish_status?: string;
  categories?: { id: number; name: string; slug: string }[];
  last_post_at?: string;
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
    const fetchSettings = async (websiteId: string | undefined) => {
      try {
        setIsLoading(true);
        if (!websiteId) {
          console.log('No current website, setting WordPress settings to null');
          setSettings(null);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No authenticated session, setting WordPress settings to null');
          setSettings(null);
          return;
        }

        console.log('Fetching WordPress settings for website ID:', websiteId);
        
        try {
          console.log('Making Supabase query for WordPress settings with website_id:', websiteId);
          const { data, error, status } = await supabase
            .from('wordpress_settings')
            .select('*')
            .eq('website_id', websiteId);
          
          if (error) {
            // Check for specific error codes
            if (error.code === 'PGRST116') {
              console.log('No WordPress settings found for website ID:', websiteId);
              setSettings(null);
              return;
            } else if (error.code === '22P02') {
              console.error('Invalid UUID format for website ID:', websiteId);
              setSettings(null);
              return;
            } else if (status === 406) {
              console.log('406 Not Acceptable error - WordPress settings table might not exist yet');
              setSettings(null);
              return;
            }
            
            console.error('Error fetching WordPress settings:', error);
            throw error;
          }

          if (!data || data.length === 0) {
            console.log('No WordPress settings found for website ID:', websiteId);
            setSettings(null);
            return;
          }

          console.log('WordPress settings fetched successfully:', data[0]);
          setSettings(data[0]);
        } catch (queryError) {
          console.error('Error in WordPress settings query:', queryError);
          // Silently fail for database issues - don't show errors to user
          setSettings(null);
        }
      } catch (err) {
        console.error('Error in fetchSettings:', err);
        setIsLoading(false);
        setSettings(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings(currentWebsite?.id);
  }, [currentWebsite]);

  // Helper function to construct WordPress admin URLs
  const constructWpUrl = (baseUrl: string, path: string = ''): string => {
    // Log raw input for debugging
    console.log('Constructing URL from:', { baseUrl, path });
    
    // Ensure we have a protocol
    let url = baseUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    try {
      // Parse the URL to handle it properly
      const parsedUrl = new URL(url);
      
      // Remove WordPress-specific paths
      const pathname = parsedUrl.pathname;
      if (pathname.includes('/wp-admin') || pathname.includes('/wp-login') || pathname.includes('/wp-content')) {
        parsedUrl.pathname = '/';
      }
      
      // Construct the final URL
      if (path) {
        // Make sure path doesn't start with a slash if the pathname already ends with one
        const cleanPath = path.replace(/^\/+/, '');
        
        // If pathname already ends with a slash, don't add another
        if (parsedUrl.pathname.endsWith('/')) {
          parsedUrl.pathname += cleanPath;
        } else {
          parsedUrl.pathname += '/' + cleanPath;
        }
      }
      
      // Log the constructed URL for debugging
      console.log('Constructed URL:', parsedUrl.toString());
      return parsedUrl.toString();
    } catch (error) {
      console.error('Error constructing WordPress URL:', error);
      
      // Fallback to basic string manipulation if URL parsing fails
      url = url.replace(/\/+$/, ''); // Remove trailing slashes
      path = path.replace(/^\/+/, ''); // Remove leading slashes
      
      const result = path ? `${url}/${path}` : url;
      console.log('Fallback constructed URL:', result);
      return result;
    }
  };

  // Initiate WordPress authentication by opening the application passwords page
  const initiateWordPressAuth = (wpAdminUrl: string) => {
    // Construct the application passwords URL
    const appPasswordsUrl = constructWpUrl(wpAdminUrl, 'wp-admin/profile.php#application-passwords-section');
    
    // Open WordPress admin in a new tab
    window.open(appPasswordsUrl, '_blank');
    
    toast.info(
      "Please follow these steps:",
      {
        description: (
          <ol className="list-decimal pl-4 mt-2 space-y-1">
            <li>Log in to your WordPress admin if needed</li>
            <li>Scroll down to "Application Passwords"</li>
            <li>Enter "ContentGardener.ai" as the name</li>
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
    console.log('Starting WordPress authentication process');
    
    if (!currentWebsite) {
      console.error('No website selected for WordPress authentication');
      toast.error('Please select a website first');
      return false;
    }

    try {
      setIsLoading(true);
      console.log('Using Supabase Edge Function for WordPress authentication');

      // Log the payload we're sending to help diagnose issues
      console.log('Sending to Edge Function:', {
        url: wpUrl,
        username: username,
        // Don't log the actual password, just its length and format
        passwordLength: password.length,
        passwordFormat: password.replace(/\S/g, "x"),
        website_id: currentWebsite.id
      });

      try {
        const { data, error } = await supabase.functions.invoke('wordpress-connect', {
          body: {
            url: wpUrl,
            username,
            password,
            website_id: currentWebsite.id
          }
        });

        console.log('Edge Function response received');

        if (error) {
          console.error('Edge Function error:', error);
          toast.error(`Connection failed: ${error.message || 'Unknown error'}`);
          
          // Fallback to direct API call if Edge Function fails
          console.log('Falling back to direct API call');
          return await fallbackDirectWordPressAuth(wpUrl, username, password);
        }

        // Log the full response for debugging
        console.log('Full response from Edge Function:', data);

        if (!data || !data.success) {
          console.error('WordPress connection failed:', data?.error || 'No success response received');
          toast.error(data?.error || 'WordPress authentication failed with an unknown error');
          return false;
        }

        // Set the settings from the response
        console.log('WordPress connection successful');
        setSettings(data.settings as unknown as WordPressSettings);
        toast.success(`Successfully connected to WordPress as ${data.wordpress_user}`);
        return true;
      } catch (e) {
        console.error('Exception when calling Edge Function:', e);
        toast.error('Error connecting to the server. Trying direct connection...');
        
        // Fallback to direct API call if Edge Function throws an exception
        return await fallbackDirectWordPressAuth(wpUrl, username, password);
      }
    } catch (error) {
      console.error('Error in completeWordPressAuth:', error);
      toast.error('Failed to connect to WordPress. Please check your credentials.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback function for direct WordPress authentication
  const fallbackDirectWordPressAuth = async (wpUrl: string, username: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting direct WordPress authentication');
      
      // Construct the API URL
      let apiUrl = wpUrl;
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = 'https://' + apiUrl;
      }
      
      // Clean URL by removing WordPress paths and trailing slashes
      try {
        const parsedUrl = new URL(apiUrl);
        if (parsedUrl.pathname.includes('/wp-admin') || 
            parsedUrl.pathname.includes('/wp-login') || 
            parsedUrl.pathname.includes('/wp-content')) {
          parsedUrl.pathname = '/';
        }
        apiUrl = parsedUrl.toString().replace(/\/+$/, '');
      } catch (e) {
        console.error('URL parsing error:', e);
        // Continue with unmodified URL if parsing fails
      }
      
      const wpApiUrl = `${apiUrl}/wp-json/wp/v2/users/me`;
      console.log('Testing direct WordPress API connection at:', wpApiUrl);
      
      // Attempt a direct API call
      const cors = 'https://corsproxy.io/?';
      const response = await fetch(cors + encodeURIComponent(wpApiUrl), {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${username}:${password}`)
        }
      });
      
      console.log('Direct API response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Failed to connect to WordPress: ';
        
        try {
          const errorData = await response.json();
          console.error('WordPress API error details:', errorData);
          errorMessage += errorData.message || response.statusText;
        } catch (e) {
          errorMessage += response.statusText;
        }
        
        toast.error(errorMessage);
        return false;
      }
      
      // Extract user data from response
      const userData = await response.json();
      console.log('WordPress authentication successful, user data:', userData);
      
      // Save to database
      // @ts-ignore - Ignore TypeScript errors for wordpress_settings table access
      const { data, error } = await supabase
        .from('wordpress_settings')
        .upsert({
          website_id: currentWebsite!.id,
          wp_url: apiUrl,
          wp_username: username,
          wp_application_password: password,
          is_connected: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Database error:', error);
        toast.error('Connected to WordPress but failed to save settings');
        return false;
      }
      
      setSettings(data as unknown as WordPressSettings);
      toast.success(`Successfully connected to WordPress as ${userData.name}`);
      return true;
    } catch (error) {
      console.error('Error in fallbackDirectWordPressAuth:', error);
      toast.error('Direct WordPress connection failed');
      return false;
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
      console.log('Testing WordPress connection via Edge Function');

      const { data, error } = await supabase.functions.invoke('wordpress-connect', {
        body: {
          url: settings.wp_url,
          username: settings.wp_username,
          password: settings.wp_application_password,
          action: 'test'
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        toast.error(error.message || 'Connection test failed');
        return false;
      }

      if (!data.success) {
        console.error('WordPress connection test failed:', data.error);
        toast.error(data.error || 'WordPress connection test failed');
        return false;
      }

      toast.success(`Successfully connected to WordPress as ${data.wordpress_user}`);
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
    console.log('WordPressContext.createPost called with:', { 
      titleLength: title.length, 
      contentLength: content.length, 
      status 
    });

    if (!settings || !currentWebsite) {
      console.error('WordPress createPost failed - settings or currentWebsite missing:', { 
        hasSettings: !!settings, 
        hasWebsite: !!currentWebsite 
      });
      toast.error('WordPress is not configured');
      return false;
    }

    try {
      let imageUrl: string | undefined;

      // Generate image first if enabled for the website
      if (currentWebsite.enable_ai_image_generation) {
        try {
          console.log('Generating image before creating post');
          // Create a temporary post ID for image storage
          const tempPostId = `temp_${Date.now()}`;
          const imageResult = await generateImage({
            content: `${title}\n\n${content}`,
            postId: tempPostId,
            websiteId: currentWebsite.id
          });
          imageUrl = imageResult.imageUrl;
          console.log('Image generated successfully:', imageUrl);
        } catch (imageError) {
          console.error('Error generating image:', imageError);
          // Don't fail the post creation if image generation fails
          toast.error('Failed to generate image, proceeding with post creation');
        }
      }

      console.log('Creating WordPress post via Edge Function for website:', {
        websiteId: currentWebsite.id,
        websiteName: currentWebsite.name
      });
      
      // Check auth session before making request
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error('Auth session error:', sessionError);
        toast.error('You must be logged in to publish to WordPress');
        return false;
      }
      
      console.log('Invoking wordpress-posts Edge Function');

      // Add the image to the content if available
      const contentWithImage = imageUrl
        ? `<img src="${imageUrl}" alt="${title}" class="wp-post-header-image wp-post-image" style="width: 100%; height: auto; max-width: 1200px; margin: 0 auto; display: block;" />\n\n${content}`
        : content;

      // Create a post theme record first
      const { data: postTheme, error: postThemeError } = await supabase
        .from('post_themes')
        .insert({
          website_id: currentWebsite.id,
          subject_matter: title,
          post_content: contentWithImage,
          status: 'draft',
          keywords: [] // Required field from db schema
        })
        .select()
        .single();

      if (postThemeError) {
        console.error('Error creating post theme:', postThemeError);
        toast.error('Failed to create post');
        return false;
      }

      if (!postTheme?.id) {
        console.error('No post theme ID returned');
        toast.error('Failed to create post');
        return false;
      }

      console.log('Created post theme:', postTheme.id);

      // Send minimal data to edge function
      const { data, error } = await supabase.functions.invoke('wordpress-posts', {
        body: {
          website_id: currentWebsite.id,
          post_theme_id: postTheme.id,
          action: 'create'
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        toast.error(error.message || 'Failed to create WordPress post');
        return false;
      }

      if (!data || !data.success) {
        console.error('WordPress post creation failed:', data?.error || 'Unknown error');
        toast.error(data?.error || 'Failed to create WordPress post');
        return false;
      }

      console.log('WordPress post created successfully:', data.post);
      
      toast.success(`Post ${status === 'publish' ? 'published' : 'saved as draft'} successfully`);
      
      // Update last_post_at in settings
      try {
        // @ts-ignore - Ignore TypeScript errors for wordpress_settings table
        const { error: updateError } = await supabase
          .from('wordpress_settings')
          .update({ last_post_at: new Date().toISOString() })
          .eq('id', settings.id);
        
        if (updateError) {
          console.warn('Failed to update last_post_at:', updateError);
        }
      } catch (updateError) {
        console.warn('Exception updating last_post_at:', updateError);
      }
      
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
    if (!settings || !currentWebsite) {
      toast.error('WordPress is not configured');
      return false;
    }

    try {
      console.log('Updating WordPress post via Edge Function');
      
      const { data, error } = await supabase.functions.invoke('wordpress-posts', {
        body: {
          website_id: currentWebsite.id,
          post_id: postId,
          title,
          content,
          status,
          action: 'update'
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        toast.error(error.message || 'Failed to update WordPress post');
        return false;
      }

      if (!data.success) {
        console.error('WordPress post update failed:', data.error);
        toast.error(data.error || 'Failed to update WordPress post');
        return false;
      }

      console.log('WordPress post updated:', data.post);
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

      // @ts-ignore - Ignore TypeScript errors for wordpress_settings table access
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