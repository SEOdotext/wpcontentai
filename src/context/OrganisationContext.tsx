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
  organisations: Organisation[];
  isLoading: boolean;
  hasOrganisation: boolean;
  createOrganisation: (name: string) => Promise<boolean>;
  updateOrganisation: (id: string, updates: Partial<Organisation>) => Promise<boolean>;
  completeNewUserSetup: (websiteUrl: string) => Promise<boolean>;
}

const OrganisationContext = createContext<OrganisationContextType>({
  organisation: null,
  organisations: [],
  isLoading: true,
  hasOrganisation: false,
  createOrganisation: async () => false,
  updateOrganisation: async () => false,
  completeNewUserSetup: async () => false,
});

export const useOrganisation = () => useContext(OrganisationContext);

// Helper functions for localStorage cache
const clearOrganisationData = () => {
  console.log('OrganisationContext: Clearing all organisation data from localStorage');
  localStorage.removeItem('currentOrganisation');
  localStorage.removeItem('organisations');
  localStorage.removeItem('current_organisation_id');
  localStorage.removeItem('organisation_id');
  localStorage.removeItem('organisation_info');
  localStorage.removeItem('currentWebsiteId');
  localStorage.removeItem('currentWebsiteName');
};

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
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [hasOrganisation, setHasOrganisation] = useState(false);
  const [organisationsCount, setOrganisationsCount] = useState(0);
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
      organisationsCount,
      isAuthenticated,
      isOnboarding
    });
  }, [isLoading, hasOrganisation, organisationsCount, isAuthenticated, isOnboarding]);

  // Fetch organisations function
  const fetchOrganisations = async () => {
    console.log('OrganisationContext: Starting to fetch organisations...');
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

      // Fetch organisations from the database with membership details
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
          ),
          created_at,
          role
        `)
        .eq('member_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('OrganisationContext: Error fetching organisations:', error);
        // Only try localStorage if database fetch fails
        const storedOrg = getStoredOrganisation();
        if (storedOrg) {
          console.log('OrganisationContext: Using stored organisation as fallback:', storedOrg.name);
          setOrganisation(storedOrg);
          setHasOrganisation(true);
          setOrganisations([storedOrg]);
        } else {
          setHasOrganisation(false);
          setOrganisation(null);
          setOrganisations([]);
        }
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
        return;
      }

      if (mounted) {
        // Transform the data to match our Organisation type
        const transformedData = (data || [])
          .map((item: any) => item.organisation)
          .filter((org: any) => org !== null) as Organisation[];
        
        // Update organisations list
        setOrganisations(transformedData);
        setOrganisationsCount(transformedData.length);
        
        if (transformedData.length > 0) {
          // Get the most recent organisation membership
          const mostRecentOrg = transformedData[0]; // Data is already ordered by created_at desc
          setOrganisation(mostRecentOrg);
          setHasOrganisation(true);
          localStorage.setItem('current_organisation_id', mostRecentOrg.id);
          localStorage.setItem('currentOrganisation', JSON.stringify(mostRecentOrg));
        } else {
          // No organisations found in database
          setOrganisation(null);
          setHasOrganisation(false);
          localStorage.removeItem('current_organisation_id');
          localStorage.removeItem('currentOrganisation');
        }
        
        setIsLoading(false);
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('OrganisationContext: Error in fetchOrganisations:', error);
      // Only try localStorage if everything else fails
      const storedOrg = getStoredOrganisation();
      if (storedOrg) {
        console.log('OrganisationContext: Using stored organisation as last resort:', storedOrg.name);
        setOrganisation(storedOrg);
        setHasOrganisation(true);
        setOrganisations([storedOrg]);
      } else {
        setHasOrganisation(false);
        setOrganisation(null);
        setOrganisations([]);
      }
      if (mounted) {
        setIsLoading(false);
        setIsInitialized(true);
      }
    }
  };

  // Helper function to safely fetch organisations with debouncing
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
      setOrganisation(cachedOrg);
      setHasOrganisation(true);
    }
    
    if (cachedOrgs.length > 0) {
      setOrganisations(cachedOrgs);
      setOrganisationsCount(cachedOrgs.length);
    }
    
    setIsInitialized(true);
  }, []);

  // Fetch organisations when authenticated
  useEffect(() => {
    if (!isInitialized) {
      console.log('OrganisationContext: Not initialized yet, skipping fetch');
      return;
    }
    
    if (!isAuthenticated) {
      console.log('OrganisationContext: Not authenticated, clearing organisation data');
      clearOrganisationData();
      setOrganisation(null);
      setOrganisations([]);
      setHasOrganisation(false);
      setIsLoading(false);
      return;
    }
    
    if (isOnboarding) {
      console.log('OrganisationContext: In onboarding flow, skipping fetch');
      setIsLoading(false);
      return;
    }
    
    console.log('OrganisationContext: Authenticated and initialized, fetching organisations');
    safeFetchOrganisations();
  }, [isAuthenticated, isInitialized, isOnboarding]);

  // Log context value changes
  useEffect(() => {
    console.log('OrganisationContext: Context value updated:', {
      isLoading,
      hasOrganisation,
      organisation: organisation ? { id: organisation.id, name: organisation.name } : null,
      organisationsCount: organisations.length
    });
  }, [isLoading, hasOrganisation, organisation, organisations]);

  // Add function to switch organisations
  const switchOrganisation = async (orgId: string) => {
    try {
      console.log('OrganisationContext: Switching to organisation:', orgId);
      setIsLoading(true);
      
      // Get organisation details
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
      
      // Update current organisation
      setOrganisation(orgData);
      
      // Redirect to home page
      console.log('OrganisationContext: Redirecting to home page');
      navigate('/');
      
      return true;
    } catch (error) {
      console.error("OrganisationContext: Error switching organisation:", error);
      toast.error("Failed to switch organisation");
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
      
      // Create organisation
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
      
      // Add user as admin to the organisation
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
      setOrganisation(orgData);
      setHasOrganisation(true);
      setOrganisations(prev => [...prev, orgData]);
      
      toast.success("Organisation created successfully");
      
      // Redirect to home after organisation is created
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
      setOrganisation(orgData);
      setOrganisations(prev => prev.map(org => 
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
      
      // Generate organisation name from website URL
      const orgName = websiteUrl
        .replace(/^https?:\/\/(www\.)?/, '')
        .split('.')[0]
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      console.log('OrganisationContext: Organisation name generated:', orgName);
      
      // Format website URL properly
      let formattedUrl = websiteUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
        console.log('OrganisationContext: URL formatted with https://', formattedUrl);
      }
      
      console.log('OrganisationContext: === STEP 1: Creating organisation ===');
      console.log('OrganisationContext: Organisation insertion payload:', { name: orgName });
      
      // Step 1: Create organisation
      const orgResponse = await supabase
        .from('organisations')
        .insert([{ name: orgName }])
        .select()
        .single();
      
      console.log('OrganisationContext: Raw organisation creation response:', orgResponse);
      
      if (orgResponse.error) {
        console.error('OrganisationContext: Error creating organisation:', orgResponse.error);
        throw new Error(`Failed to create organisation: ${orgResponse.error.message} (${orgResponse.error.code})`);
      }
      
      const orgData = orgResponse.data;
      if (!orgData) {
        console.error('OrganisationContext: No organisation data returned');
        throw new Error('No organisation data returned after creation');
      }
      
      console.log('OrganisationContext: Organisation created successfully:', orgData);
      const organisationId = orgData.id;
      console.log('OrganisationContext: Organisation ID:', organisationId);

      console.log('OrganisationContext: === STEP 2: Creating organisation membership ===');
      console.log('OrganisationContext: Membership insertion payload:', {
        member_id: userId,
        organisation_id: organisationId,
        role: 'admin'
      });
      
      // Step 2: Add user as admin to the organisation
      const membershipResponse = await supabase
        .from('organisation_memberships')
        .insert({
          member_id: userId,
          organisation_id: organisationId,
          role: 'admin'
        });
      
      console.log('OrganisationContext: Raw membership creation response:', membershipResponse);
      
      if (membershipResponse.error) {
        console.error('OrganisationContext: Error creating organisation membership:', membershipResponse.error);
        throw new Error(`Failed to create membership: ${membershipResponse.error.message} (${membershipResponse.error.code})`);
      }
      
      console.log('OrganisationContext: Organisation membership created for user:', userId);

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
      
      console.log('OrganisationContext: Organisation state updated successfully');
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
    setOrganisation(org);
    setStoredOrganisation(org);
  };

  // Update the setOrganisations function to also update localStorage
  const updateOrganisationsState = (orgs: Organisation[]) => {
    console.log('OrganisationContext: Updating organisations state:', orgs.length);
    setOrganisations(orgs);
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
      organisation: organisation,
      organisations: organisations,
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

