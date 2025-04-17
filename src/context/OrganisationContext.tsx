import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface Organisation {
  id: string;
  name: string;
  created_at: string;
  current_plan?: string;
  credits?: number;
  next_payment_date?: string;
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

interface OrganisationMembershipResponse {
  organisation: {
    id: string;
    name: string;
    created_at: string;
  } | null;
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
      console.log('OrganisationContext: Retrieved stored organisation from localStorage');
      return JSON.parse(storedData);
    } catch (e) {
      console.error('OrganisationContext: Error parsing stored organisation data:', e);
      return null;
    }
  }
  console.log('OrganisationContext: No stored organisation found in localStorage');
  return null;
};

const getStoredOrganisations = () => {
  const storedData = localStorage.getItem('organisations');
  if (storedData) {
    try {
      console.log('OrganisationContext: Retrieved stored organisations from localStorage');
      return JSON.parse(storedData);
    } catch (e) {
      console.error('OrganisationContext: Error parsing stored organisations data:', e);
      return [];
    }
  }
  console.log('OrganisationContext: No stored organisations found in localStorage');
  return [];
};

const setStoredOrganisation = (org: Organisation | null) => {
  if (org) {
    console.log('OrganisationContext: Storing organisation in localStorage:', org.id);
    localStorage.setItem('currentOrganisation', JSON.stringify(org));
  } else {
    console.log('OrganisationContext: Removing organisation from localStorage');
    localStorage.removeItem('currentOrganisation');
  }
};

const setStoredOrganisations = (orgs: Organisation[]) => {
  console.log('OrganisationContext: Storing organisations in localStorage:', orgs.length);
  localStorage.setItem('organisations', JSON.stringify(orgs));
};

export const OrganisationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [organization, setOrganization] = useState<Organisation | null>(null);
  const [organizations, setOrganizations] = useState<Organisation[]>([]);
  const [hasOrganisation, setHasOrganisation] = useState(false);
  const [organizationsCount, setOrganizationsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const fetchTimeout = useRef<NodeJS.Timeout | null>(null);
  const { isAuthenticated, isOnboarding } = useAuth();
  const navigate = useNavigate();

  // Log state changes
  useEffect(() => {
    console.log('OrganisationContext: State updated:', {
      isLoading,
      hasOrganisation,
      organizationsCount,
      isAuthenticated,
      isOnboarding
    });
  }, [isLoading, hasOrganisation, organizationsCount, isAuthenticated, isOnboarding]);

  // Fetch organizations function
  const fetchOrganisations = async () => {
    console.log('OrganisationContext: Starting to fetch organizations...');
    let mounted = true;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('OrganisationContext: Session data in fetchOrganisations:', session ? 'Session found' : 'No session');
      
      if (!session) {
        console.log('OrganisationContext: No session found, setting loading to false');
          if (mounted) {
            setHasOrganisation(false);
            setIsLoading(false);
          setIsInitialized(true);
          }
          return;
        }

      // Check if we have a stored organization in localStorage
      const storedOrg = getStoredOrganisation();
      if (storedOrg) {
        console.log('OrganisationContext: Found stored organization in localStorage:', storedOrg.name);
        setOrganization(storedOrg);
        setHasOrganisation(true);
        setIsLoading(false);
        setIsInitialized(true);
      }

      // Fetch organizations from the database
      const { data, error } = await supabase
        .from('organisation_memberships')
        .select(`
          organisation:organisations (
            id,
            name,
            created_at,
            current_plan,
            credits,
            next_payment_date
          )
        `)
        .eq('member_id', session.user.id);

      if (error) {
        console.error('OrganisationContext: Error fetching organizations:', error);
        // Only reset state if we don't have any existing organization data
        if (!organization && organizations.length === 0) {
          setHasOrganisation(false);
        }
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
        return;
      }

      if (mounted) {
        // Transform the data to match our Organization type
        const transformedData = (data || [])
          .map((item: any) => item.organisation)
          .filter((org: any) => org !== null) as Organisation[];
        
        // Update organizations list
        setOrganizations(transformedData);
        setOrganizationsCount(transformedData.length);
        
        // If we have a stored organization ID, try to find it in the fetched data
        const storedOrgId = localStorage.getItem('current_organisation_id');
        if (storedOrgId) {
          const storedOrg = transformedData.find(org => org.id === storedOrgId);
          if (storedOrg) {
            setOrganization(storedOrg);
            setHasOrganisation(true);
          } else {
            // If stored org not found, use the first one or null
            if (transformedData && transformedData.length > 0) {
              setOrganization(transformedData[0]);
              setHasOrganisation(true);
              localStorage.setItem('current_organisation_id', transformedData[0].id);
            } else {
              setOrganization(null);
              setHasOrganisation(false);
              localStorage.removeItem('current_organisation_id');
            }
          }
        } else if (transformedData && transformedData.length > 0) {
          // No stored org ID, use the first one
          setOrganization(transformedData[0]);
          setHasOrganisation(true);
          localStorage.setItem('current_organisation_id', transformedData[0].id);
        } else {
          setOrganization(null);
          setHasOrganisation(false);
        }
        
        setIsLoading(false);
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('OrganisationContext: Organization fetch timed out or failed:', error);
      // Keep existing data if we have it
      if (!organization && organizations.length === 0) {
        setHasOrganisation(false);
      }
      if (mounted) {
        setIsLoading(false);
        setIsInitialized(true);
        console.log('OrganisationContext: Initialization completed, loading:', false);
      }
    }
  };

  // Helper function to safely fetch organizations with debouncing
  const safeFetchOrganisations = async () => {
    // Prevent multiple simultaneous fetches
    if (fetchInProgress.current) {
      console.log('OrganisationContext: Fetch already in progress, skipping');
      return;
    }

    // Debounce fetches to prevent rapid consecutive calls
    const now = Date.now();
    if (now - lastFetchTime.current < 1000) {
      console.log('OrganisationContext: Debouncing fetch, too soon since last fetch');
      if (fetchTimeout.current) {
        clearTimeout(fetchTimeout.current);
      }
      fetchTimeout.current = setTimeout(() => {
        fetchTimeout.current = null;
        safeFetchOrganisations();
      }, 1000);
      return;
    }
    
    lastFetchTime.current = now;
    fetchInProgress.current = true;
    
    try {
      await fetchOrganisations();
    } finally {
      fetchInProgress.current = false;
    }
  };

  // Initialize with cached data
  useEffect(() => {
    console.log('OrganisationContext: Initializing with cached data');
    const cachedOrg = getStoredOrganisation();
    const cachedOrgs = getStoredOrganisations();
    
    console.log('OrganisationContext: Initializing with cached data:', {
      hasCachedOrg: !!cachedOrg,
      cachedOrgsCount: cachedOrgs.length
    });
    
    if (cachedOrg) {
      setOrganization(cachedOrg);
      setHasOrganisation(true);
    }
    
    if (cachedOrgs.length > 0) {
      setOrganizations(cachedOrgs);
      setOrganizationsCount(cachedOrgs.length);
    }
    
    setIsInitialized(true);
  }, []);

  // Fetch organizations when authenticated
  useEffect(() => {
    if (!isInitialized) {
      console.log('OrganisationContext: Not initialized yet, skipping fetch');
      return;
    }
    
    if (!isAuthenticated) {
      console.log('OrganisationContext: Not authenticated, skipping fetch');
      setIsLoading(false);
      return;
    }
    
    if (isOnboarding) {
      console.log('OrganisationContext: In onboarding flow, skipping fetch');
      setIsLoading(false);
      return;
    }
    
    console.log('OrganisationContext: Authenticated and initialized, fetching organizations');
    safeFetchOrganisations();
  }, [isAuthenticated, isInitialized, isOnboarding]);

  // Log context value changes
  useEffect(() => {
    console.log('OrganisationContext: Context value updated:', {
      isLoading,
      hasOrganisation,
      organization: organization ? { id: organization.id, name: organization.name } : null,
      organizationsCount: organizations.length
    });
  }, [isLoading, hasOrganisation, organization, organizations]);

  // Add function to switch organizations
  const switchOrganisation = async (orgId: string) => {
    try {
      console.log('OrganisationContext: Switching to organisation:', orgId);
      setIsLoading(true);
      
      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', orgId)
        .single();
      
      if (orgError) {
        console.error('OrganisationContext: Error fetching organisation details:', orgError);
        throw orgError;
      }
      
      console.log('OrganisationContext: Organisation details fetched:', orgData.name);
      
      // Update current organization
      setOrganization(orgData);
      
      // Redirect to home page
      console.log('OrganisationContext: Redirecting to home page');
      navigate('/');
      
      return true;
    } catch (error) {
      console.error("OrganisationContext: Error switching organization:", error);
      toast.error("Failed to switch organization");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new organisation
  const createOrganisation = async (name: string): Promise<boolean> => {
    try {
      console.log('OrganisationContext: Creating new organisation:', name);
      setIsLoading(true);
      
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.error('OrganisationContext: User not authenticated when creating organisation');
        toast.error("You must be logged in to create an organisation");
        return false;
      }
      
      console.log('OrganisationContext: User authenticated, creating organisation in database');
      
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .insert([{ name }])
        .select()
        .single();
      
      if (orgError) {
        console.error('OrganisationContext: Error creating organisation:', orgError);
        throw orgError;
      }
      
      console.log('OrganisationContext: Organisation created in database:', orgData.id);
      
      // Add user as admin to the organization
      console.log('OrganisationContext: Adding user as admin to organisation');
      const { error: membershipError } = await supabase
        .from('organisation_memberships')
        .insert({
          member_id: sessionData.session.user.id,
          organisation_id: orgData.id,
          role: 'admin'
        });
      
      if (membershipError) {
        console.error('OrganisationContext: Error creating membership:', membershipError);
        throw membershipError;
      }
      
      console.log('OrganisationContext: User added as admin to organisation');
      
      // Update state
      setOrganization(orgData);
      setHasOrganisation(true);
      setOrganizations(prev => [...prev, orgData]);
      
      toast.success("Organisation created successfully");
      
      // Redirect to home after organization is created
      console.log('OrganisationContext: Redirecting to home page');
      navigate('/');
      
      return true;
    } catch (error) {
      console.error("OrganisationContext: Error in createOrganisation:", error);
      toast.error("Failed to create organisation");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing organisation
  const updateOrganisation = async (id: string, updates: Partial<Organisation>): Promise<boolean> => {
    try {
      console.log('OrganisationContext: Updating organisation:', { id, updates });
      setIsLoading(true);
      
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.error('OrganisationContext: User not authenticated when updating organisation');
        toast.error("You must be logged in to update the organisation");
        return false;
      }

      console.log('OrganisationContext: User authenticated, verifying admin access');
      
      // First verify the user has admin access to this organisation
      const { data: membershipData, error: membershipError } = await supabase
        .from('organisation_memberships')
        .select('role')
        .eq('member_id', sessionData.session.user.id)
        .eq('organisation_id', id)
        .single();

      if (membershipError) {
        console.error("OrganisationContext: Error verifying user access:", membershipError);
        toast.error("Failed to verify user access");
        return false;
      }

      if (membershipData.role !== 'admin') {
        console.error("OrganisationContext: User does not have admin access to this organisation");
        toast.error("You don't have permission to update this organisation");
        return false;
      }
      
      console.log('OrganisationContext: User has admin access, proceeding with update');
      
      // Update organisation
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (orgError) {
        console.error('OrganisationContext: Error updating organisation:', orgError);
        throw orgError;
      }
      
      console.log('OrganisationContext: Organisation updated successfully:', orgData.id);
      
      // Update state
      setOrganization(orgData);
      setOrganizations(prev => prev.map(org => 
        org.id === id ? orgData : org
      ));
      
      toast.success("Organisation updated successfully");
      return true;
    } catch (error) {
      console.error("OrganisationContext: Error in updateOrganisation:", error);
      toast.error("Failed to update organisation");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Complete setup for new users
  const completeNewUserSetup = async (websiteUrl: string): Promise<boolean> => {
    try {
      console.log('OrganisationContext: === SETUP PROCESS STARTED ===');
      console.log('OrganisationContext: Input website URL:', websiteUrl);
      setIsLoading(true);
      
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.error('OrganisationContext: No auth session found');
        toast.error("You must be logged in to complete setup");
        return false;
      }

      const userId = sessionData.session.user.id;
      console.log('OrganisationContext: User authenticated, ID:', userId);

      // Check Supabase auth and role
      try {
        console.log('OrganisationContext: === CHECKING DB ACCESS ===');
        const { data: authData, error: authError } = await supabase.auth.getUser();
        console.log('OrganisationContext: Current auth info:', authData, authError ? 'ERROR: ' + authError.message : 'No auth error');
        
        // Test write permission with a read-only query
        const { error: testError } = await supabase
          .from('organisations')
          .select('count(*)', { count: 'exact', head: true });
        
        console.log('OrganisationContext: Test query result:', testError ? 'ERROR: ' + testError.message : 'Access OK');
      } catch (permError) {
        console.error('OrganisationContext: Permission check error:', permError);
      }
      
      // Generate organization name from website URL
      const orgName = websiteUrl
        .replace(/^https?:\/\/(www\.)?/, '')
        .split('.')[0]
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      console.log('OrganisationContext: Organization name generated:', orgName);
      
      // Format website URL properly
      let formattedUrl = websiteUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
        console.log('OrganisationContext: URL formatted with https://', formattedUrl);
      }
      
      console.log('OrganisationContext: === STEP 1: Creating organization ===');
      console.log('OrganisationContext: Organization insertion payload:', { name: orgName });
      
      // Step 1: Create organization
      const orgResponse = await supabase
        .from('organisations')
        .insert([{ name: orgName }])
        .select()
        .single();
      
      console.log('OrganisationContext: Raw organisation creation response:', orgResponse);
      
      if (orgResponse.error) {
        console.error('OrganisationContext: Error creating organization:', orgResponse.error);
        throw new Error(`Failed to create organization: ${orgResponse.error.message} (${orgResponse.error.code})`);
      }
      
      const orgData = orgResponse.data;
      if (!orgData) {
        console.error('OrganisationContext: No organization data returned');
        throw new Error('No organization data returned after creation');
      }
      
      console.log('OrganisationContext: Organization created successfully:', orgData);
      const organisationId = orgData.id;
      console.log('OrganisationContext: Organization ID:', organisationId);

      console.log('OrganisationContext: === STEP 2: Creating organization membership ===');
      console.log('OrganisationContext: Membership insertion payload:', {
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
      
      console.log('OrganisationContext: Raw membership creation response:', membershipResponse);
      
      if (membershipResponse.error) {
        console.error('OrganisationContext: Error creating organization membership:', membershipResponse.error);
        throw new Error(`Failed to create membership: ${membershipResponse.error.message} (${membershipResponse.error.code})`);
      }
      
      console.log('OrganisationContext: Organization membership created for user:', userId);

      console.log('OrganisationContext: === STEP 3: Creating website ===');
      console.log('OrganisationContext: Website insertion payload:', {
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

      console.log('OrganisationContext: Raw website creation response:', websiteResponse);
      
      if (websiteResponse.error) {
        console.error('OrganisationContext: Error creating website:', websiteResponse.error);
        throw new Error(`Failed to create website: ${websiteResponse.error.message} (${websiteResponse.error.code})`);
      }

      const websiteData = websiteResponse.data;
      if (!websiteData) {
        console.error('OrganisationContext: No website data returned');
        throw new Error('No website data returned after creation');
      }

      console.log('OrganisationContext: Website created successfully:', websiteData);

      // Set the current website ID in localStorage
      console.log('OrganisationContext: Setting currentWebsiteId in localStorage:', websiteData.id);
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
      
      console.log('OrganisationContext: Organization state updated successfully');
      console.log('OrganisationContext: === SETUP PROCESS COMPLETED SUCCESSFULLY ===');
      toast.success("Setup completed successfully");
      
      // Force a full page refresh to ensure all contexts are properly reloaded
      setTimeout(() => {
        console.log('OrganisationContext: Redirecting to homepage');
        window.location.href = '/';
      }, 1000);
      
      return true;
    } catch (error) {
      console.error("OrganisationContext: === SETUP PROCESS FAILED ===");
      console.error("OrganisationContext: Error in completeNewUserSetup:", error);
      
      // Check if it's a Supabase PostgrestError
      if (error && typeof error === 'object' && 'code' in error) {
        console.error(`OrganisationContext: Database error code: ${error.code}`);
        
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
    console.log('OrganisationContext: Updating organisation state:', org ? org.id : 'null');
    setOrganization(org);
    setStoredOrganisation(org);
  };

  // Update the setOrganizations function to also update localStorage
  const updateOrganisationsState = (orgs: Organisation[]) => {
    console.log('OrganisationContext: Updating organizations state:', orgs.length);
    setOrganizations(orgs);
    setStoredOrganisations(orgs);
  };

  // Clean up on unmount
  useEffect(() => {
    console.log('OrganisationContext: Provider mounted');
    return () => {
      console.log('OrganisationContext: Provider cleanup');
      if (fetchTimeout.current) {
        clearTimeout(fetchTimeout.current);
      }
    };
  }, []);

  return (
    <OrganisationContext.Provider value={{
      organisation: organization,
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

