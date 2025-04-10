import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Organisation {
  id: string;
  name: string;
  created_at: string;
}

interface OrganisationMembership {
  organisation_id: string;
  role: string;
  organisation: {
    id: string;
    name: string;
    created_at: string;
  };
}

interface OrganisationResponse {
  organisation: {
    id: string;
    name: string;
    created_at: string;
  };
}

interface OrganisationContextType {
  organisation: Organisation | null;
  organizations: Organisation[];
  isLoading: boolean;
  hasOrganisation: boolean;
  createOrganisation: (name: string) => Promise<boolean>;
  updateOrganisation: (id: string, updates: Partial<Organisation>) => Promise<boolean>;
  completeNewUserSetup: (websiteUrl: string) => Promise<boolean>;
}

const OrganisationContext = createContext<OrganisationContextType>({
  organisation: null,
  organizations: [],
  isLoading: true,
  hasOrganisation: false,
  createOrganisation: async () => false,
  updateOrganisation: async () => false,
  completeNewUserSetup: async () => false,
});

export const useOrganisation = () => useContext(OrganisationContext);

// Helper functions for localStorage cache
const getStoredOrganisation = () => {
  const storedData = localStorage.getItem('currentOrganisation');
  if (storedData) {
    try {
      return JSON.parse(storedData);
    } catch (e) {
      console.error('Error parsing stored organisation data:', e);
      return null;
    }
  }
  return null;
};

const getStoredOrganisations = () => {
  const storedData = localStorage.getItem('organisations');
  if (storedData) {
    try {
      return JSON.parse(storedData);
    } catch (e) {
      console.error('Error parsing stored organisations data:', e);
      return [];
    }
  }
  return [];
};

const setStoredOrganisation = (org: Organisation | null) => {
  if (org) {
    localStorage.setItem('currentOrganisation', JSON.stringify(org));
  } else {
    localStorage.removeItem('currentOrganisation');
  }
};

const setStoredOrganisations = (orgs: Organisation[]) => {
  localStorage.setItem('organisations', JSON.stringify(orgs));
};

export const OrganisationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with cached data from localStorage
  const cachedOrg = getStoredOrganisation();
  const cachedOrgs = getStoredOrganisations();

  const [organisation, setOrganisation] = useState<Organisation | null>(cachedOrg);
  const [organizations, setOrganizations] = useState<Organisation[]>(cachedOrgs);
  const [isLoading, setIsLoading] = useState(!cachedOrg); // Only show loading if no cached data
  const [hasOrganisation, setHasOrganisation] = useState(!!cachedOrg);
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  const navigate = useNavigate();

  // Add a safety timeout to prevent being stuck in loading state
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (isLoading && initializationAttempted) {
        console.log("Loading timeout reached after initialization attempt, setting loading to false");
        setIsLoading(false);
      }
    }, 10000); // 10-second max loading time

    return () => clearTimeout(loadingTimeout);
  }, [isLoading, initializationAttempted]);

  // Update localStorage when state changes
  useEffect(() => {
    setStoredOrganisation(organisation);
  }, [organisation]);

  useEffect(() => {
    setStoredOrganisations(organizations);
  }, [organizations]);

  // Fetch user's organizations on mount
  useEffect(() => {
    let mounted = true;
    console.log('OrganisationProvider mounted');
    
    const fetchOrganisations = async () => {
      if (!mounted) return;
      
      try {
        setIsLoading(true);
        console.log('Starting to fetch organizations...');
        
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Session data in fetchOrganisations:', sessionData);
        
        if (!sessionData.session) {
          console.log('No session found, setting loading to false');
          if (mounted) {
            updateOrganisationState(null);
            updateOrganisationsState([]);
            setHasOrganisation(false);
            setIsLoading(false);
            setInitializationAttempted(true);
          }
          return;
        }

        // Add a timeout in case the request hangs
        const fetchPromise = new Promise(async (resolve, reject) => {
          try {
            console.log('Fetching organizations for user:', sessionData.session.user.id);
            const { data: orgs, error } = await supabase
              .from('organisation_memberships')
              .select(`
                organisation:organisations (
                  id,
                  name,
                  created_at
                )
              `)
              .eq('member_id', sessionData.session.user.id) as { data: OrganisationResponse[] | null, error: any };

            if (error) {
              console.error('Error fetching organizations:', error);
              // Only reset state if we don't have any existing organization data
              if (!organisation && organizations.length === 0) {
                setHasOrganisation(false);
              }
              console.log('Error handled gracefully, keeping existing state if available');
              resolve(null);
              return;
            }

            if (mounted) {
              console.log('Organizations fetched:', orgs);
              if (orgs && orgs.length > 0) {
                const formattedOrgs = orgs.map(org => ({
                  id: org.organisation.id,
                  name: org.organisation.name,
                  created_at: org.organisation.created_at
                } as Organisation));
                
                updateOrganisationsState(formattedOrgs);
                updateOrganisationState(formattedOrgs[0]);
                setHasOrganisation(true);
              } else {
                console.log('No organizations found for user');
                setHasOrganisation(false);
              }
            }
            resolve(orgs);
          } catch (error) {
            reject(error);
          }
        });

        // Race the fetch with a timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Organization fetch timed out')), 8000); // Increased timeout
        });

        try {
          await Promise.race([fetchPromise, timeoutPromise]);
        } catch (error) {
          console.error('Organization fetch timed out or failed:', error);
          // Keep existing data if we have it
          if (!organisation && organizations.length === 0) {
            setHasOrganisation(false);
          }
        } finally {
          if (mounted) {
            setIsLoading(false);
            setInitializationAttempted(true);
          }
        }
      } catch (error) {
        console.error('Error in fetchOrganisations:', error);
        if (mounted) {
          setIsLoading(false);
          setInitializationAttempted(true);
        }
      }
    };

    // Start fetch with a small delay to allow other contexts to initialize
    const initTimer = setTimeout(fetchOrganisations, 500);

    return () => {
      mounted = false;
      clearTimeout(initTimer);
      console.log('OrganisationProvider cleanup');
    };
  }, [organisation, organizations]);

  // Log context value changes
  useEffect(() => {
    console.log('OrganisationContext value updated:', {
      isLoading,
      hasOrganisation,
      organization: organisation,
      organizations
    });
  }, [isLoading, hasOrganisation, organisation, organizations]);

  // Add function to switch organizations
  const switchOrganisation = async (orgId: string) => {
    try {
      setIsLoading(true);
      
      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', orgId)
        .single();
      
      if (orgError) throw orgError;
      
      // Update current organization
      setOrganisation(orgData);
      
      // Redirect to home page
      navigate('/');
      
      return true;
    } catch (error) {
      console.error("Error switching organization:", error);
      toast.error("Failed to switch organization");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new organisation
  const createOrganisation = async (name: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("You must be logged in to create an organisation");
        return false;
      }
      
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .insert([{ name }])
        .select()
        .single();
      
      if (orgError) throw orgError;
      
      // Add user as admin to the organization
      const { error: membershipError } = await supabase
        .from('organisation_memberships')
        .insert({
          member_id: sessionData.session.user.id,
          organisation_id: orgData.id,
          role: 'admin'
        });
      
      if (membershipError) throw membershipError;
      
      // Update state
      setOrganisation(orgData);
      setHasOrganisation(true);
      setOrganizations(prev => [...prev, orgData]);
      
      toast.success("Organisation created successfully");
      
      // Redirect to home after organization is created
      navigate('/');
      
      return true;
    } catch (error) {
      console.error("Error in createOrganisation:", error);
      toast.error("Failed to create organisation");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing organisation
  const updateOrganisation = async (id: string, updates: Partial<Organisation>): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("You must be logged in to update the organisation");
        return false;
      }

      console.log('Updating organisation:', { id, updates });
      
      // First verify the user has admin access to this organisation
      const { data: membershipData, error: membershipError } = await supabase
        .from('organisation_memberships')
        .select('role')
        .eq('member_id', sessionData.session.user.id)
        .eq('organisation_id', id)
        .single();

      if (membershipError) {
        console.error("Error verifying user access:", membershipError);
        toast.error("Failed to verify user access");
        return false;
      }

      if (membershipData.role !== 'admin') {
        console.error("User does not have admin access to this organisation");
        toast.error("You don't have permission to update this organisation");
        return false;
      }
      
      // Update organisation
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (orgError) throw orgError;
      
      // Update state
      setOrganisation(orgData);
      setOrganizations(prev => prev.map(org => 
        org.id === id ? orgData : org
      ));
      
      toast.success("Organisation updated successfully");
      return true;
    } catch (error) {
      console.error("Error in updateOrganisation:", error);
      toast.error("Failed to update organisation");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Complete setup for new users
  const completeNewUserSetup = async (websiteUrl: string): Promise<boolean> => {
    try {
      console.log('=== SETUP PROCESS STARTED ===');
      console.log('Input website URL:', websiteUrl);
      setIsLoading(true);
      
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.error('No auth session found');
        toast.error("You must be logged in to complete setup");
        return false;
      }

      const userId = sessionData.session.user.id;
      console.log('User authenticated, ID:', userId);

      // Check Supabase auth and role
      try {
        console.log('=== CHECKING DB ACCESS ===');
        const { data: authData, error: authError } = await supabase.auth.getUser();
        console.log('Current auth info:', authData, authError ? 'ERROR: ' + authError.message : 'No auth error');
        
        // Test write permission with a read-only query
        const { error: testError } = await supabase
          .from('organisations')
          .select('count(*)', { count: 'exact', head: true });
        
        console.log('Test query result:', testError ? 'ERROR: ' + testError.message : 'Access OK');
      } catch (permError) {
        console.error('Permission check error:', permError);
      }
      
      // Generate organization name from website URL
      const orgName = websiteUrl
        .replace(/^https?:\/\/(www\.)?/, '')
        .split('.')[0]
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      console.log('Organization name generated:', orgName);
      
      // Format website URL properly
      let formattedUrl = websiteUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
        console.log('URL formatted with https://', formattedUrl);
      }
      
      console.log('=== STEP 1: Creating organization ===');
      console.log('Organization insertion payload:', { name: orgName });
      
      // Step 1: Create organization
      const orgResponse = await supabase
        .from('organisations')
        .insert([{ name: orgName }])
        .select()
        .single();
      
      console.log('Raw organisation creation response:', orgResponse);
      
      if (orgResponse.error) {
        console.error('Error creating organization:', orgResponse.error);
        throw new Error(`Failed to create organization: ${orgResponse.error.message} (${orgResponse.error.code})`);
      }
      
      const orgData = orgResponse.data;
      if (!orgData) {
        console.error('No organization data returned');
        throw new Error('No organization data returned after creation');
      }
      
      console.log('Organization created successfully:', orgData);
      const organisationId = orgData.id;
      console.log('Organization ID:', organisationId);

      console.log('=== STEP 2: Creating organization membership ===');
      console.log('Membership insertion payload:', {
        member_id: userId,
        organisation_id: organisationId,
        role: 'admin'
      });
      
      // Step 2: Add user as admin to the organization
      const membershipResponse = await supabase
        .from('organisation_memberships')
        .insert({
          member_id: userId,
          organisation_id: organisationId,
          role: 'admin'
        });
      
      console.log('Raw membership creation response:', membershipResponse);
      
      if (membershipResponse.error) {
        console.error('Error creating organization membership:', membershipResponse.error);
        throw new Error(`Failed to create membership: ${membershipResponse.error.message} (${membershipResponse.error.code})`);
      }
      
      console.log('Organization membership created for user:', userId);

      console.log('=== STEP 3: Creating website ===');
      console.log('Website insertion payload:', {
        url: formattedUrl,
        name: orgName,
        organisation_id: organisationId,
        language: 'en',
        enable_ai_image_generation: false,
        page_import_limit: 100,
        key_content_limit: 20
      });
      
      // Step 3: Create website with all required fields
      const websiteResponse = await supabase
        .from('websites')
        .insert({
          url: formattedUrl,
          name: orgName,
          organisation_id: organisationId,
          language: 'en', // Default language
          enable_ai_image_generation: false, // Default setting
          page_import_limit: 100, // Default limit
          key_content_limit: 20 // Default limit
        })
        .select()
        .single();

      console.log('Raw website creation response:', websiteResponse);
      
      if (websiteResponse.error) {
        console.error('Error creating website:', websiteResponse.error);
        throw new Error(`Failed to create website: ${websiteResponse.error.message} (${websiteResponse.error.code})`);
      }

      const websiteData = websiteResponse.data;
      if (!websiteData) {
        console.error('No website data returned');
        throw new Error('No website data returned after creation');
      }

      console.log('Website created successfully:', websiteData);

      // Set the current website ID in localStorage
      console.log('Setting currentWebsiteId in localStorage:', websiteData.id);
      localStorage.setItem('currentWebsiteId', websiteData.id);
      localStorage.setItem('currentWebsiteName', websiteData.name);

      // Update state
      const updatedOrg = {
        id: orgData.id,
        name: orgData.name,
        created_at: orgData.created_at
      };
      
      updateOrganisationState(updatedOrg);
      updateOrganisationsState([updatedOrg]);
      setHasOrganisation(true);
      
      console.log('Organization state updated successfully');
      console.log('=== SETUP PROCESS COMPLETED SUCCESSFULLY ===');
      toast.success("Setup completed successfully");
      
      // Force a full page refresh to ensure all contexts are properly reloaded
      setTimeout(() => {
        console.log('Redirecting to homepage');
        window.location.href = '/';
      }, 1000);
      
      return true;
    } catch (error) {
      console.error("=== SETUP PROCESS FAILED ===");
      console.error("Error in completeNewUserSetup:", error);
      
      // Check if it's a Supabase PostgrestError
      if (error && typeof error === 'object' && 'code' in error) {
        console.error(`Database error code: ${error.code}`);
        
        if (error.code === '42501') {
          toast.error("Permission denied: You don't have access to create resources");
        } else if (error.code === '23505') {
          toast.error("A resource with that name already exists");
        } else {
          toast.error(`Database error: ${error.message || 'Unknown error'}`);
        }
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to complete setup");
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update the setOrganisation function to also update localStorage
  const updateOrganisationState = (org: Organisation | null) => {
    setOrganisation(org);
    setStoredOrganisation(org);
  };

  // Update the setOrganizations function to also update localStorage
  const updateOrganisationsState = (orgs: Organisation[]) => {
    setOrganizations(orgs);
    setStoredOrganisations(orgs);
  };

  return (
    <OrganisationContext.Provider value={{
      organisation,
      organizations,
      isLoading,
      hasOrganisation,
      createOrganisation,
      updateOrganisation,
      completeNewUserSetup
    }}>
      {children}
    </OrganisationContext.Provider>
  );
};
