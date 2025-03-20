import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Website {
  id: string;
  name: string;
  url: string;
  organisation_id?: string | null;
  created_at: string;
  updated_at?: string;
  language?: string;
}

interface WebsitesContextType {
  websites: Website[];
  currentWebsite: Website | null;
  setCurrentWebsite: (website: Website | null) => void;
  addWebsite: (name: string, url: string) => Promise<boolean>;
  deleteWebsite: (id: string) => Promise<boolean>;
  updateWebsite: (id: string, updates: { name?: string; url?: string; language?: string }) => Promise<boolean>;
  isLoading: boolean;
}

const WebsitesContext = createContext<WebsitesContextType>({
  websites: [],
  currentWebsite: null,
  setCurrentWebsite: () => {},
  addWebsite: async () => false,
  deleteWebsite: async () => false,
  updateWebsite: async () => false,
  isLoading: false,
});

export const useWebsites = () => useContext(WebsitesContext);

export const WebsitesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [currentWebsite, setCurrentWebsite] = useState<Website | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch websites from Supabase on component mount
  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        
        if (!session) {
          console.log("User not authenticated, using sample data");
          provideSampleData();
          return;
        }
        
        // Fetch websites
        const { data, error } = await supabase
          .from('websites')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          console.log("Websites fetched:", data);
          setWebsites(data as Website[]);
          
          // Check if there's a saved website ID in localStorage
          const savedWebsiteId = localStorage.getItem('currentWebsiteId');
          
          if (savedWebsiteId) {
            // Find the website with the saved ID
            const savedWebsite = data.find(website => website.id === savedWebsiteId);
            if (savedWebsite) {
              console.log("Restoring previously selected website:", savedWebsite.name);
              setCurrentWebsite(savedWebsite as Website);
            } else {
              // Fallback to first website if saved ID not found
              console.log("Saved website ID not found, using first website");
              setCurrentWebsite(data[0] as Website);
            }
          } else if (!currentWebsite) {
            // Set first website as current if none is saved and none is selected
            setCurrentWebsite(data[0] as Website);
          }
        } else {
          // If no websites exist, create a default one
          const { data: newWebsite, error: insertError } = await supabase
            .from('websites')
            .insert({
              name: 'My Tech Blog',
              url: 'https://mytechblog.com'
            })
            .select()
            .single();
            
          if (insertError) throw insertError;
          
          if (newWebsite) {
            console.log("Created new website:", newWebsite);
            setWebsites([newWebsite as Website]);
            setCurrentWebsite(newWebsite as Website);
          }
        }
      } catch (error) {
        console.error('Error fetching websites:', error);
        toast.error('Failed to load websites. Using sample data instead.');
        
        // Fall back to sample data if database fetch fails
        provideSampleData();
      } finally {
        setIsLoading(false);
      }
    };

    const provideSampleData = () => {
      const sampleData: Website[] = [
        {
          id: '1',
          name: 'Sample Website 1',
          url: 'https://example.com',
          organisation_id: '1',
          created_at: new Date().toISOString(),
          language: 'en'
        },
        {
          id: '2',
          name: 'Sample Website 2',
          url: 'https://example2.com',
          organisation_id: '1',
          created_at: new Date().toISOString(),
          language: 'da'
        }
      ];
      
      setWebsites(sampleData);
      setCurrentWebsite(sampleData[0]);
      setIsLoading(false);
      
      // Persist the selected website in localStorage
      localStorage.setItem('currentWebsite', JSON.stringify(sampleData[0]));
    };

    fetchWebsites();
  }, []);

  // Add a new website
  const addWebsite = async (name: string, url: string): Promise<boolean> => {
    try {
      // Check authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('You must be logged in to add a website');
        return false;
      }

      // Get user's organisation_id
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('organisation_id')
        .eq('id', sessionData.session.user.id)
        .single();

      if (profileError || !profileData?.organisation_id) {
        toast.error('Failed to get organization information');
        return false;
      }

      const { data, error } = await supabase
        .from('websites')
        .insert({
          name,
          url,
          organisation_id: profileData.organisation_id
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        setWebsites(prev => [data as Website, ...prev]);
        toast.success('Website added successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error adding website:', error);
      toast.error('Failed to add website');
      return false;
    }
  };

  // Handle setting the current website
  const handleSetCurrentWebsite = (website: Website) => {
    console.log("Setting current website:", website.name, "with ID:", website.id);
    setCurrentWebsite(website);
    localStorage.setItem('currentWebsiteId', website.id);
    console.log("Saved website ID to localStorage:", website.id);
  };

  // Add delete website function
  const deleteWebsite = async (id: string): Promise<boolean> => {
    try {
      // Check authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('You must be logged in to delete a website');
        return false;
      }

      // First verify the user has access to this website through their organization
      const website = websites.find(w => w.id === id);
      if (!website) {
        toast.error('Website not found');
        return false;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('organisation_id')
        .eq('id', sessionData.session.user.id)
        .single();

      if (profileError || !profileData?.organisation_id) {
        toast.error('Failed to verify access');
        return false;
      }

      if (website.organisation_id !== profileData.organisation_id) {
        toast.error('You do not have permission to delete this website');
        return false;
      }

      // Delete the website
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setWebsites(prev => prev.filter(website => website.id !== id));
      if (currentWebsite?.id === id) {
        const remainingWebsites = websites.filter(w => w.id !== id);
        setCurrentWebsite(remainingWebsites.length > 0 ? remainingWebsites[0] : null);
      }
      
      toast.success('Website deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting website:', error);
      toast.error('Failed to delete website');
      return false;
    }
  };

  // Update website function should be modified to accept language
  const updateWebsite = async (
    id: string, 
    updates: { name?: string; url?: string; language?: string }
  ): Promise<boolean> => {
    try {
      // Check authentication
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('You must be logged in to update a website');
        return false;
      }

      // First verify the user has access to this website through their organization
      const website = websites.find(w => w.id === id);
      if (!website) {
        toast.error('Website not found');
        return false;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('organisation_id')
        .eq('id', sessionData.session.user.id)
        .single();

      if (profileError || !profileData?.organisation_id) {
        toast.error('Failed to verify access');
        return false;
      }

      if (website.organisation_id !== profileData.organisation_id) {
        toast.error('You do not have permission to update this website');
        return false;
      }

      // Create update object, only including provided fields
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.url !== undefined) updateData.url = updates.url;
      if (updates.language !== undefined) updateData.language = updates.language;

      // Update the website
      const { data, error } = await supabase
        .from('websites')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Update local state with the new data
        setWebsites(websites.map(w => w.id === id ? data : w));
        
        // If the current website was updated, update it too
        if (currentWebsite && currentWebsite.id === id) {
          setCurrentWebsite(data);
          
          // Update localStorage if it exists
          localStorage.setItem('currentWebsite', JSON.stringify(data));
        }
        
        toast.success('Website updated successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating website:', error);
      toast.error('Failed to update website');
      return false;
    }
  };

  return (
    <WebsitesContext.Provider 
      value={{ 
        websites, 
        currentWebsite, 
        setCurrentWebsite: handleSetCurrentWebsite, 
        addWebsite,
        deleteWebsite,
        updateWebsite,
        isLoading
      }}
    >
      {children}
    </WebsitesContext.Provider>
  );
};
