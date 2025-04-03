import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '../integrations/supabase/types';

type Website = Database['public']['Tables']['websites']['Row'] & {
  organisation_name?: string;
};
type WebsiteInsert = Omit<Database['public']['Tables']['websites']['Insert'], 'organisation_id'> & {
  page_import_limit?: number;
  key_content_limit?: number;
};
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
  const [currentWebsiteId, setSavedWebsiteId] = useState<string | undefined>(
    localStorage.getItem('currentWebsiteId') || undefined
  );

  // Add useEffect for initial fetch and safety timeout
  useEffect(() => {
    console.log("WebsitesContext: Provider mounted");
    
    // Add a safety timeout to ensure we don't get stuck in loading state
    const safetyTimer = setTimeout(() => {
      console.log('WebsitesContext: Safety timeout triggered after 3 seconds');
      if (isLoading) {
        console.log('WebsitesContext: Still loading after timeout, forcing to complete');
        setIsLoading(false);
      }
    }, 3000);
    
    // Check auth before initial fetch
    const checkAuthBeforeFetch = async () => {
      try {
        console.log("WebsitesContext: Checking auth before initial fetch");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("WebsitesContext: Auth session error:", error);
          setIsLoading(false);
          return;
        }
        
        if (!data.session) {
          console.log("WebsitesContext: No auth session found, skipping website fetch");
          setIsLoading(false);
          return;
        }
        
        console.log("WebsitesContext: Auth session found, proceeding with fetch");
        console.log("WebsitesContext: Initial fetch on mount");
        fetchWebsites();
      } catch (err) {
        console.error("WebsitesContext: Error checking auth:", err);
        setIsLoading(false);
      }
    };
    
    checkAuthBeforeFetch();
    
    return () => {
      console.log("WebsitesContext: Provider unmounted");
      clearTimeout(safetyTimer);
    };
  }, []);

  const fetchWebsites = async () => {
    try {
      console.log("WebsitesContext: Starting to fetch websites...");
      console.log("WebsitesContext: Current state before fetch:", { websites: websites.length, currentWebsite, isLoading });
      setIsLoading(true);
      
      // Remove the fetchTimeout and Promise.race code
      console.log("WebsitesContext: Getting user data from auth");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("WebsitesContext: Error getting user", userError);
        setIsLoading(false);
        return;
      }
      
      if (!userData || !userData.user) {
        console.log("WebsitesContext: No authenticated user found");
        setWebsites([]);
        setCurrentWebsite(null);
        setIsLoading(false);
        return;
      }
      
      console.log("WebsitesContext: Authenticated user found", userData.user.id);
      
      // Process with safer timeout checks and component mounting safety checks
      try {
        // First get the user's organisation_id and role from organisation_memberships
        console.log("WebsitesContext: Fetching organization membership for user", userData.user.id);
        const { data: membership, error: membershipError } = await supabase
          .from('organisation_memberships')
          .select('organisation_id, role')
          .eq('member_id', userData.user.id)
          .single();

        console.log("WebsitesContext: Membership query completed");
        
        if (membershipError) {
          console.error('WebsitesContext: Error fetching membership:', membershipError);
          console.log('WebsitesContext: Membership error details:', JSON.stringify(membershipError, null, 2));
          throw membershipError;
        }

        if (!membership) {
          console.log('WebsitesContext: No organization membership found for user');
          setWebsites([]);
          setIsLoading(false);
          return;
        }

        console.log('WebsitesContext: User membership data:', membership);
        console.log('WebsitesContext: User role:', membership.role);
        console.log('WebsitesContext: Organization ID:', membership.organisation_id);
        
        // Store the user's role in localStorage for access across the app
        localStorage.setItem('userRole', membership.role);
        console.log('WebsitesContext: Saved user role to localStorage:', membership.role);

        // Set some defaults in case subsequent calls fail
        setWebsites([]);
        setCurrentWebsite(null);
        
        // Get a minimal set of data to keep things moving
        const { data: websitesData, error: websitesError } = await supabase
          .from('websites')
          .select('*')
          .eq('organisation_id', membership.organisation_id);
        
        if (websitesError || !websitesData) {
          console.error('WebsitesContext: Error or timeout fetching websites:', websitesError);
          throw websitesError || new Error('Failed to fetch websites');
        }
        
        if (websitesData.length > 0) {
          console.log('WebsitesContext: Successfully got websites data:', websitesData.length);
          setWebsites(websitesData);
          
          // Check if there's a saved website ID in localStorage
          const savedWebsiteId = localStorage.getItem('currentWebsiteId');
          if (savedWebsiteId) {
            const savedWebsite = websitesData.find(site => site.id === savedWebsiteId);
            if (savedWebsite) {
              setCurrentWebsite(savedWebsite);
            } else {
              setCurrentWebsite(websitesData[0]);
            }
          } else if (websitesData.length > 0) {
            setCurrentWebsite(websitesData[0]);
          }
        }
      } catch (innerError) {
        console.error("WebsitesContext: Inner error in fetch process:", innerError);
        // Allow the component to continue without data rather than staying in loading
      }
    } catch (err) {
      console.error("WebsitesContext: Error in fetchWebsites:", err);
      console.log('WebsitesContext: Error type:', typeof err);
      console.log('WebsitesContext: Error details:', JSON.stringify(err, null, 2));
      setError(err as Error);
      toast.error("Failed to load websites");
    } finally {
      console.log("WebsitesContext: Setting isLoading to false in finally block");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("WebsitesContext: Provider mounted");
    
    // Force immediate fetch on mount
    (async () => {
      console.log("WebsitesContext: Initial fetch on mount");
      await fetchWebsites();
    })();

    // Set up subscription to websites table changes
    const subscription = supabase
      .channel('websites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'websites' }, (payload) => {
        console.log("WebsitesContext: Website table changed", payload);
        fetchWebsites();
      })
      .subscribe();

    // Also set up subscription to organisation_memberships table changes
    const membershipSubscription = supabase
      .channel('organisation_memberships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organisation_memberships' }, (payload) => {
        console.log("WebsitesContext: Organisation memberships changed", payload);
        fetchWebsites();
      })
      .subscribe();

    // Set up auth state change listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("WebsitesContext: Auth state changed", event, session?.user.id);
      fetchWebsites();
    });

    return () => {
      console.log("WebsitesContext: Provider unmounting, cleaning up subscriptions");
      subscription.unsubscribe();
      membershipSubscription.unsubscribe();
      authSubscription.unsubscribe();
    };
  }, []);

  // Log website state changes for debugging
  useEffect(() => {
    console.log("WebsitesContext: Current websites state:", {
      websites,
      currentWebsite,
      currentWebsiteId: currentWebsite?.id,
      savedWebsiteId: localStorage.getItem('currentWebsiteId')
    });
  }, [websites, currentWebsite]);

  const provideSampleData = () => {
    console.log('WebsitesContext: No sample data provided - to avoid masking real issues');
    
    // Set empty arrays/null values instead of fake data
    setWebsites([]);
    setCurrentWebsite(null);
    setIsLoading(false);
    
    // Clear any previously stored website data
    localStorage.removeItem('currentWebsiteId');
    localStorage.removeItem('currentWebsite');
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
        console.error('Error fetching membership:', membershipError);
        throw membershipError;
      }

      if (!membership) {
        throw new Error('User not in any organisation');
      }
      
      console.log('Adding website for organization:', membership.organisation_id);
      
      // Format URL if needed
      let formattedUrl = website.url;
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      
      // Ensure website has all necessary fields with defaults
      const websiteWithDefaults = {
        ...website,
        url: formattedUrl,
        organisation_id: membership.organisation_id,
        language: website.language || 'en',
        enable_ai_image_generation: website.enable_ai_image_generation ?? false,
        page_import_limit: website.page_import_limit || 100,
        key_content_limit: website.key_content_limit || 20
      };
      
      console.log('Creating website with data:', websiteWithDefaults);

      const { data: newWebsite, error } = await supabase
        .from('websites')
        .insert([websiteWithDefaults])
        .select();

      if (error) {
        console.error('Error creating website:', error);
        throw error;
      }
      
      console.log('Website created successfully:', newWebsite);

      // Refresh the websites list
      await fetchWebsites();
      
      // Set as current website if it's the first one
      if (websites.length === 0 && newWebsite && newWebsite.length > 0) {
        console.log('Setting newly created website as current:', newWebsite[0].id);
        localStorage.setItem('currentWebsiteId', newWebsite[0].id);
        localStorage.setItem('currentWebsiteName', newWebsite[0].name);
        setCurrentWebsite(newWebsite[0] as Website);
      }
      
      // Show success toast
      toast.success('Website added successfully');
    } catch (err) {
      console.error('Error in addWebsite:', err);
      setError(err instanceof Error ? err : new Error('Failed to add website'));
      toast.error(err instanceof Error ? err.message : 'Failed to add website');
      throw err;
    }
  };

  const handleSetCurrentWebsite = (website: Website | null) => {
    // Don't proceed if the website is null or undefined
    if (!website) {
      console.log("WebsitesContext: Attempted to set null website");
      return;
    }
    
    console.log("WebsitesContext: Setting current website:", website.name, "with ID:", website.id);
    
    // Set the current website in state
    setCurrentWebsite(website);
    
    // Always save to localStorage to ensure persistence between page loads
    localStorage.setItem('currentWebsiteId', website.id);
    console.log("WebsitesContext: Saved website ID to localStorage:", website.id);
    
    // Optional: Store additional website data for debugging
    try {
      localStorage.setItem('currentWebsiteName', website.name);
      localStorage.setItem('currentWebsiteData', JSON.stringify({
        id: website.id,
        name: website.name,
        url: website.url
      }));
    } catch (error) {
      console.error("WebsitesContext: Error saving website data to localStorage:", error);
    }
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
