import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '../integrations/supabase/types';

type Website = Database['public']['Tables']['websites']['Row'];
type WebsiteInsert = Omit<Database['public']['Tables']['websites']['Insert'], 'organisation_id'>;
type WebsiteUpdate = Database['public']['Tables']['websites']['Update'];

interface WebsitesContextType {
  websites: Website[];
  currentWebsite: Website | null;
  setCurrentWebsite: (website: Website | null) => void;
  addWebsite: (website: WebsiteInsert) => Promise<void>;
  deleteWebsite: (id: string) => Promise<void>;
  updateWebsite: (id: string, website: WebsiteUpdate) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

const WebsitesContext = createContext<WebsitesContextType | undefined>(undefined);

export const useWebsites = () => {
  const context = useContext(WebsitesContext);
  if (context === undefined) {
    throw new Error('useWebsites must be used within a WebsitesProvider');
  }
  return context;
};

export const WebsitesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [currentWebsite, setCurrentWebsite] = useState<Website | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWebsites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWebsites([]);
        return;
      }

      // First get the user's organisation_id and role from organisation_memberships
      const { data: membership, error: membershipError } = await supabase
        .from('organisation_memberships')
        .select('organisation_id, role')
        .eq('member_id', user.id)
        .single();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership) {
        setWebsites([]);
        return;
      }

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', membership.organisation_id)
        .single();

      if (orgError) {
        throw orgError;
      }

      let websitesData;

      // For admins, fetch all websites in the organization
      if (membership.role === 'admin') {
        const { data, error } = await supabase
          .from('websites')
          .select('*')
          .eq('organisation_id', membership.organisation_id);

        if (error) {
          throw error;
        }
        
        websitesData = data;
      } 
      // For members, only fetch websites they have access to
      else {
        // Get website IDs the user has access to
        const { data: websiteAccess, error: accessError } = await supabase
          .from('website_access')
          .select('website_id')
          .eq('user_id', user.id);

        if (accessError) {
          throw accessError;
        }

        if (!websiteAccess || websiteAccess.length === 0) {
          setWebsites([]);
          return;
        }

        // Get the websites by their IDs
        const websiteIds = websiteAccess.map(access => access.website_id);
        const { data, error } = await supabase
          .from('websites')
          .select('*')
          .in('id', websiteIds);

        if (error) {
          throw error;
        }
        
        websitesData = data;
      }

      // Add organization name to each website
      const websitesWithOrg = websitesData.map(website => ({
        ...website
      }));

      setWebsites(websitesWithOrg || []);

      // Check if there's a saved website ID in localStorage
      const savedWebsiteId = localStorage.getItem('currentWebsiteId');
      
      if (savedWebsiteId) {
        // Find the website with the saved ID
        const savedWebsite = websitesWithOrg.find(website => website.id === savedWebsiteId);
        if (savedWebsite) {
          console.log("Restoring previously selected website:", savedWebsite.name);
          setCurrentWebsite(savedWebsite as Website);
        } else {
          // Fallback to first website if saved ID not found
          console.log("Saved website ID not found, using first website");
          setCurrentWebsite(websitesWithOrg.length > 0 ? websitesWithOrg[0] as Website : null);
        }
      } else if (!currentWebsite && websitesWithOrg.length > 0) {
        // Set first website as current if none is saved and none is selected
        setCurrentWebsite(websitesWithOrg[0] as Website);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch websites'));
      toast.error('Failed to load websites. Using sample data instead.');
      
      // Fall back to sample data if database fetch fails
      provideSampleData();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();

    const subscription = supabase
      .channel('websites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'websites' }, () => {
        fetchWebsites();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const addWebsite = async (website: WebsiteInsert) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the user's organisation_id
      const { data: membership, error: membershipError } = await supabase
        .from('organisation_memberships')
        .select('organisation_id')
        .eq('member_id', user.id)
        .single();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership) {
        throw new Error('User not in any organisation');
      }

      const { error } = await supabase
        .from('websites')
        .insert([{ ...website, organisation_id: membership.organisation_id }]);

      if (error) {
        throw error;
      }

      // Refresh the websites list
      await fetchWebsites();
      
      // Show success toast
      toast.success('Website added successfully');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add website'));
      throw err;
    }
  };

  const handleSetCurrentWebsite = (website: Website) => {
    console.log("Setting current website:", website.name, "with ID:", website.id);
    setCurrentWebsite(website);
    localStorage.setItem('currentWebsiteId', website.id);
    console.log("Saved website ID to localStorage:", website.id);
  };

  const deleteWebsite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setWebsites(prev => prev.filter(website => website.id !== id));
      if (currentWebsite?.id === id) {
        const remainingWebsites = websites.filter(w => w.id !== id);
        setCurrentWebsite(remainingWebsites.length > 0 ? remainingWebsites[0] : null);
      }
      
      toast.success('Website deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete website'));
      throw err;
    }
  };

  const updateWebsite = async (id: string, website: WebsiteUpdate) => {
    try {
      const { error } = await supabase
        .from('websites')
        .update(website)
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update website'));
      throw err;
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
        isLoading,
        error
      }}
    >
      {children}
    </WebsitesContext.Provider>
  );
};
