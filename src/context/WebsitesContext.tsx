import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '../integrations/supabase/types';

type Website = Database['public']['Tables']['websites']['Row'] & {
  organisation_name?: string;
  enable_some?: boolean;
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
  // Try to restore data from localStorage initially
  const savedWebsiteId = localStorage.getItem('currentWebsiteId');
  const savedWebsiteName = localStorage.getItem('currentWebsiteName');
  const storedWebsites = localStorage.getItem('websitesCache');
  
  // Create initial website object from localStorage if available
  const initialWebsite = savedWebsiteId && savedWebsiteName ? {
    id: savedWebsiteId,
    name: savedWebsiteName,
    // Include minimal fields needed to render UI initially
    url: localStorage.getItem('currentWebsiteUrl') || '',
    organisation_id: localStorage.getItem('currentOrgId') || '',
  } as Website : null;
  
  // Parse stored websites if available
  const initialWebsites = storedWebsites ? JSON.parse(storedWebsites) as Website[] : [];

  const [websites, setWebsites] = useState<Website[]>(initialWebsites);
  const [currentWebsite, setCurrentWebsite] = useState<Website | null>(initialWebsite);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [savedWebsiteIdState, setSavedWebsiteIdState] = useState<string | null>(savedWebsiteId);
  const [isAuthStateChange, setIsAuthStateChange] = useState<boolean>(false);

  // Add safety timeout to prevent getting stuck in loading state
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('WebsitesContext: Safety timeout triggered, forcing loading to false');
        setIsLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(safetyTimeout);
  }, [isLoading]);

  // Cache websites data in localStorage when it changes
  useEffect(() => {
    if (websites.length > 0) {
      localStorage.setItem('websitesCache', JSON.stringify(websites));
    }
  }, [websites]);

  // Cache current website data when it changes
  useEffect(() => {
    if (currentWebsite) {
      try {
        console.log('WebsitesContext: Caching current website data:', {
          id: currentWebsite.id,
          name: currentWebsite.name,
          url: currentWebsite.url,
          timestamp: new Date().toISOString()
        });
        
        // Store website data with timestamp
        const websiteData = {
          id: currentWebsite.id,
          name: currentWebsite.name,
          url: currentWebsite.url || '',
          organisation_id: currentWebsite.organisation_id,
          timestamp: new Date().toISOString()
        };
        
        // Store all data in a single object to prevent race conditions
        localStorage.setItem('currentWebsiteData', JSON.stringify(websiteData));
        
        // For backward compatibility, also store individual items
        localStorage.setItem('currentWebsiteId', currentWebsite.id);
        localStorage.setItem('currentWebsiteName', currentWebsite.name);
        localStorage.setItem('currentWebsiteUrl', currentWebsite.url || '');
        localStorage.setItem('currentOrgId', currentWebsite.organisation_id);
        setSavedWebsiteIdState(currentWebsite.id);
      } catch (error) {
        console.error('WebsitesContext: Error caching website data:', error);
      }
    } else {
      // Clear website data from localStorage when no website is selected
      try {
        console.log('WebsitesContext: Clearing website data from localStorage');
        localStorage.removeItem('currentWebsiteData');
        localStorage.removeItem('currentWebsiteId');
        localStorage.removeItem('currentWebsiteName');
        localStorage.removeItem('currentWebsiteUrl');
        localStorage.removeItem('currentOrgId');
        setSavedWebsiteIdState(null);
      } catch (error) {
        console.error('WebsitesContext: Error clearing website data:', error);
      }
    }
  }, [currentWebsite]);

  const restoreSavedWebsite = (websitesWithOrg: Website[]) => {
    if (isInitialized && !isAuthStateChange) return;

    try {
      // First try to get the complete website data object
      const savedWebsiteData = localStorage.getItem('currentWebsiteData');
      let currentSavedId = null;
      
      if (savedWebsiteData) {
        const parsedData = JSON.parse(savedWebsiteData);
        currentSavedId = parsedData.id;
        console.log('WebsitesContext: Restored website data from localStorage:', {
          id: parsedData.id,
          name: parsedData.name,
          timestamp: parsedData.timestamp
        });
      } else {
        // Fallback to individual items for backward compatibility
        currentSavedId = localStorage.getItem('currentWebsiteId');
      }
      
      console.log('WebsitesContext: Saved website ID from state:', currentSavedId);
      
      // If we already have a current website set, don't override it
      if (currentWebsite) {
        console.log("WebsitesContext: Current website already set, not restoring from saved state");
        return;
      }
      
      if (currentSavedId) {
        // Find the website with the saved ID among the accessible websites
        const savedWebsite = websitesWithOrg.find(website => website.id === currentSavedId);
        if (savedWebsite) {
          console.log("WebsitesContext: Restoring previously selected website:", {
            id: savedWebsite.id,
            name: savedWebsite.name,
            url: savedWebsite.url
          });
          setCurrentWebsite(savedWebsite as Website);
        } else if (websitesWithOrg.length > 0) {
          // If the saved website is no longer accessible, use the first accessible one
          console.log("WebsitesContext: Saved website ID not accessible or not found, using first website:", {
            id: websitesWithOrg[0].id,
            name: websitesWithOrg[0].name
          });
          setCurrentWebsite(websitesWithOrg[0] as Website);
          setSavedWebsiteIdState(websitesWithOrg[0].id);
        }
      } else if (websitesWithOrg.length > 0) {
        // Set first website as current if none is saved
        console.log("WebsitesContext: No saved website found, using first website:", {
          id: websitesWithOrg[0].id,
          name: websitesWithOrg[0].name
        });
        setCurrentWebsite(websitesWithOrg[0] as Website);
        setSavedWebsiteIdState(websitesWithOrg[0].id);
      } else {
        // Reset current website if user has no access to any websites
        console.log("WebsitesContext: No accessible websites found, resetting current website");
        setCurrentWebsite(null);
        setSavedWebsiteIdState(null);
        // Clear localStorage since there are no accessible websites
        localStorage.removeItem('currentWebsiteData');
        localStorage.removeItem('currentWebsiteId');
        localStorage.removeItem('currentWebsiteName');
        localStorage.removeItem('currentWebsiteUrl');
        localStorage.removeItem('currentOrgId');
      }
    } catch (error) {
      console.error('WebsitesContext: Error restoring website:', error);
      // Fallback to first website if available
      if (websitesWithOrg.length > 0) {
        console.log("WebsitesContext: Error occurred, falling back to first website");
        setCurrentWebsite(websitesWithOrg[0] as Website);
        setSavedWebsiteIdState(websitesWithOrg[0].id);
      } else {
        setCurrentWebsite(null);
        setSavedWebsiteIdState(null);
      }
    }
    setIsInitialized(true);
    setIsAuthStateChange(false);
  };

  const fetchWebsites = async () => {
    try {
      console.log("WebsitesContext: Starting to fetch websites...");
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("WebsitesContext: No authenticated user found");
        setWebsites([]);
        setCurrentWebsite(null);
        setIsLoading(false);
        return;
      }
      console.log("WebsitesContext: Authenticated user found", user.id);

      // First get the user's organisation_id and role from organisation_memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('organisation_memberships')
        .select('organisation_id, role')
        .eq('member_id', user.id);

      if (membershipError) {
        console.error('WebsitesContext: Error fetching memberships:', membershipError);
        throw membershipError;
      }

      if (!memberships || memberships.length === 0) {
        console.log('WebsitesContext: No organization memberships found for user');
        setWebsites([]);
        setCurrentWebsite(null);
        setIsLoading(false);
        return;
      }

      console.log('WebsitesContext: User memberships data:', memberships);
      
      // Use the first membership by default (can be enhanced later to support multiple organizations)
      const membership = memberships[0];
      console.log('WebsitesContext: Using membership:', membership);
      console.log('WebsitesContext: User role:', membership.role);
      
      // Store the user's role in localStorage for access across the app
      localStorage.setItem('userRole', membership.role);

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', membership.organisation_id)
        .single();

      if (orgError) {
        console.error('WebsitesContext: Error fetching organization:', orgError);
        throw orgError;
      }
      
      console.log('WebsitesContext: Organization data:', orgData);

      let websitesData;

      // If the user is an admin, they can see all websites in the organization
      if (membership.role === 'admin') {
        console.log('WebsitesContext: User is admin, fetching all organization websites');
        const { data, error } = await supabase
          .from('websites')
          .select('*')
          .eq('organisation_id', membership.organisation_id);

        if (error) {
          console.error('WebsitesContext: Error fetching websites:', error);
          throw error;
        }
        
        websitesData = data;
        console.log('WebsitesContext: Fetched websites:', websitesData);
      } 
      // If the user is a member, they can only see websites they have access to
      else {
        console.log('WebsitesContext: User is a member, fetching accessible websites');
        
        // Try an alternative approach - first try to get the user's team data which includes website access
        const { data: teamData, error: teamError } = await supabase.rpc('get_team_data', {
          organisation_id: membership.organisation_id
        });
        
        if (teamError) {
          console.error('WebsitesContext: Error fetching team data:', teamError);
        } else if (teamData && teamData.team_members) {
          console.log('WebsitesContext: Found team data:', teamData);
          
          // Find the current user in the team members
          const currentUserData = teamData.team_members.find((member: any) => member.id === user.id);
          
          if (currentUserData && currentUserData.website_access && currentUserData.website_access.length > 0) {
            console.log('WebsitesContext: Found user website access via team data:', currentUserData.website_access);
            
            // Extract website info directly from the team data
            const userWebsites = currentUserData.website_access.map((access: any) => ({
              ...access.website,
              organisation_name: orgData.name
            }));
            
            console.log('WebsitesContext: Extracted websites for user:', userWebsites);
            
            if (userWebsites.length > 0) {
              setWebsites(userWebsites);
              
              // Check if there's a saved website ID in localStorage
              const savedWebsiteId = localStorage.getItem('currentWebsiteId');
              
              if (savedWebsiteId) {
                // Find the website with the saved ID among the accessible websites
                const savedWebsite = userWebsites.find(website => website.id === savedWebsiteId);
                if (savedWebsite) {
                  console.log("WebsitesContext: Restoring previously selected website:", savedWebsite.name);
                  setCurrentWebsite(savedWebsite as Website);
                } else if (userWebsites.length > 0) {
                  // If the saved website is no longer accessible, use the first accessible one
                  console.log("WebsitesContext: Saved website ID not accessible or not found, using first website");
                  setCurrentWebsite(userWebsites[0] as Website);
                }
              } else if (userWebsites.length > 0) {
                // Set first website as current if none is saved
                setCurrentWebsite(userWebsites[0] as Website);
              }
              
              setIsLoading(false);
              return; // Exit early as we've set everything up
            }
          }
        }
        
        // Fall back to the original approach if team data method fails
        // Get websites the user has access to from website_access table
        const { data: accessibleWebsites, error: accessError } = await supabase
          .from('website_access')
          .select('website_id')
          .eq('user_id', user.id);

        if (accessError) {
          console.error('WebsitesContext: Error fetching website access:', accessError);
          throw accessError;
        }

        console.log('WebsitesContext: Accessible websites:', accessibleWebsites);

        if (!accessibleWebsites || accessibleWebsites.length === 0) {
          console.log('WebsitesContext: No website access found for user');
          setWebsites([]);
          setCurrentWebsite(null);
          return;
        }

        // Extract website IDs the user has access to
        const websiteIds = accessibleWebsites.map(access => access.website_id);
        console.log('WebsitesContext: Website IDs user has access to:', websiteIds);

        // Get the actual website details
        const { data, error } = await supabase
          .from('websites')
          .select('*')
          .in('id', websiteIds);

        if (error) {
          console.error('WebsitesContext: Error fetching websites by IDs:', error);
          throw error;
        }

        console.log('WebsitesContext: Fetched websites for member:', data);
        websitesData = data;
      }

      // Add organization name to each website
      const websitesWithOrg = websitesData.map(website => ({
        ...website,
        organisation_name: orgData.name
      }));
      
      console.log('WebsitesContext: Websites with organization data:', websitesWithOrg);

      setWebsites(websitesWithOrg || []);
      restoreSavedWebsite(websitesWithOrg);

    } catch (err) {
      console.error("WebsitesContext: Error fetching websites:", err);
      setError(err instanceof Error ? err : new Error('Failed to fetch websites'));
      toast.error('Failed to load websites. Using sample data instead.');
      
      // Fall back to sample data if database fetch fails
      provideSampleData();
    } finally {
      console.log('WebsitesContext: Setting loading to false');
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
      setIsAuthStateChange(true);
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
      // First, delete any related publication_settings records
      const { error: settingsError } = await supabase
        .from('publication_settings')
        .delete()
        .eq('website_id', id);
      
      if (settingsError) {
        throw settingsError;
      }
      
      // Now delete the website
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
      toast.error('Failed to delete website: ' + (err instanceof Error ? err.message : 'Unknown error'));
      throw err;
    }
  };

  const updateWebsite = async (id: string, website: WebsiteUpdate) => {
    try {
      const { data, error } = await supabase
        .from('websites')
        .update(website)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setWebsites(prev => 
        prev.map(w => w.id === id ? { ...w, ...data } : w)
      );

      // If the current website is being updated, update that too
      if (currentWebsite?.id === id) {
        setCurrentWebsite({ ...currentWebsite, ...data });
      }

      toast.success('Website updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update website'));
      toast.error('Failed to update website: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
