
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
}

interface WebsitesContextType {
  websites: Website[];
  currentWebsite: Website | null;
  setCurrentWebsite: (website: Website) => void;
  addWebsite: (name: string, url: string) => Promise<boolean>;
  isLoading: boolean;
}

const WebsitesContext = createContext<WebsitesContextType>({
  websites: [],
  currentWebsite: null,
  setCurrentWebsite: () => {},
  addWebsite: async () => false,
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
          
          // Set first website as current if none is selected
          if (!currentWebsite) {
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
      // Fall back to sample data if database fetch fails
      const sampleWebsites: Website[] = [
        { 
          id: '1', 
          name: 'My Tech Blog', 
          url: 'https://mytechblog.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setWebsites(sampleWebsites);
      setCurrentWebsite(sampleWebsites[0]);
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

      const { data, error } = await supabase
        .from('websites')
        .insert({
          name,
          url
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
    setCurrentWebsite(website);
    localStorage.setItem('currentWebsiteId', website.id);
  };

  return (
    <WebsitesContext.Provider 
      value={{ 
        websites, 
        currentWebsite, 
        setCurrentWebsite: handleSetCurrentWebsite, 
        addWebsite,
        isLoading
      }}
    >
      {children}
    </WebsitesContext.Provider>
  );
};
