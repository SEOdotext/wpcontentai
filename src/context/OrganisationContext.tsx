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

export const OrganisationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [organizations, setOrganizations] = useState<Organisation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasOrganisation, setHasOrganisation] = useState(false);
  const navigate = useNavigate();

  // Fetch user's organizations on mount
  useEffect(() => {
    console.log('OrganisationProvider mounted');
    
    // Add a safety timeout to ensure we don't get stuck in loading state
    const safetyTimer = setTimeout(() => {
      console.log('OrganisationProvider: Safety timeout triggered after 3 seconds');
      if (isLoading) {
        console.log('OrganisationProvider: Still loading after timeout, forcing to complete');
        setIsLoading(false);
        setOrganisation(null);
        setOrganizations([]);
        setHasOrganisation(false);
      }
    }, 3000); // Reduced from 5000 to 3000 for faster UI
    
    const fetchOrganisations = async () => {
      try {
        console.log('fetchOrganisations: Starting try block');
        setIsLoading(true);
        console.log('Starting to fetch organizations...');
        
        console.log('fetchOrganisations: Getting session data');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Session data in fetchOrganisations:', sessionData);
        console.log('Session error in fetchOrganisations:', sessionError);
        
        if (sessionError) {
          console.error('Session error in fetchOrganisations:', sessionError);
          setOrganisation(null);
          setOrganizations([]);
          setHasOrganisation(false);
          setIsLoading(false);
          return;
        }
        
        if (!sessionData || !sessionData.session) {
          console.log('No session found, setting loading to false');
          setOrganisation(null);
          setOrganizations([]);
          setHasOrganisation(false);
          setIsLoading(false);
          return;
        }

        console.log('Fetching organizations for user:', sessionData.session.user.id);
        console.log('About to query organisation_memberships table');
        
        // Query organisation memberships
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

        console.log('Query completed, checking for errors');
        if (error) {
          console.error('Error fetching organizations:', error);
          // Don't throw here, just continue with empty organizations
          setOrganisation(null);
          setOrganizations([]);
          setHasOrganisation(false);
          setIsLoading(false);
          return;
        }

        console.log('Organizations fetched:', orgs);
        console.log('Number of organizations fetched:', orgs?.length || 0);
        if (orgs && orgs.length > 0) {
          console.log('Processing organization data');
          const formattedOrgs = orgs.map(org => ({
            id: org.organisation.id,
            name: org.organisation.name,
            created_at: org.organisation.created_at
          } as Organisation));
          
          console.log('Formatted organizations:', formattedOrgs);
          setOrganizations(formattedOrgs);
          console.log('Setting first organization as current:', formattedOrgs[0]);
          setOrganisation(formattedOrgs[0]);
          setHasOrganisation(true);
          console.log('Has organization set to true');
        } else {
          console.log('No organizations found for user');
          setHasOrganisation(false);
          console.log('Has organization set to false');
        }
      } catch (error) {
        console.error("Error fetching organisations:", error);
        console.log('Error type:', typeof error);
        console.log('Error details:', JSON.stringify(error, null, 2));
        toast.error("Failed to load organizations");
        setHasOrganisation(false);
      } finally {
        console.log('Setting loading to false in finally block');
        setIsLoading(false);
      }
    };

    // Check for auth first before fetching
    const checkAuthBeforeFetch = async () => {
      try {
        console.log('OrganisationProvider: Checking auth before initial fetch');
        const { data } = await supabase.auth.getSession();
        
        if (!data || !data.session) {
          console.log('OrganisationProvider: No auth session, skipping fetch');
          setIsLoading(false);
          setOrganisation(null);
          setOrganizations([]);
          setHasOrganisation(false);
          return;
        }
        
        console.log('OrganisationProvider: Auth session found, proceeding with fetch');
        console.log('OrganisationProvider: Session user ID:', data.session.user.id);
        
        // Initial fetch
        console.log('Calling fetchOrganisations initially');
        await fetchOrganisations();
        
        // If no organization was found after fetch, try a more direct approach
        if (!hasOrganisation && organizations.length === 0) {
          console.log('OrganisationProvider: No organizations found in initial fetch, trying direct query');
          try {
            const { data: orgsData, error: orgsError } = await supabase
              .from('organisations')
              .select('id, name, created_at')
              .order('created_at', { ascending: false })
              .limit(10);
            
            if (orgsError) {
              console.error('OrganisationProvider: Direct query error:', orgsError);
              return;
            }
            
            if (orgsData && orgsData.length > 0) {
              console.log('OrganisationProvider: Found organizations via direct query:', orgsData.length);
              setOrganizations(orgsData);
              setOrganisation(orgsData[0]);
              setHasOrganisation(true);
            }
          } catch (directQueryError) {
            console.error('OrganisationProvider: Error in direct query:', directQueryError);
          }
        }
      } catch (error) {
        console.error('OrganisationProvider: Error checking auth:', error);
        setIsLoading(false);
        setOrganisation(null);
        setOrganizations([]);
        setHasOrganisation(false);
      }
    };
    
    checkAuthBeforeFetch();

    // Subscribe to auth changes
    console.log('Setting up auth state change subscription');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event);
      console.log('Session exists:', session ? 'yes' : 'no');
      if (session) {
        console.log('User authenticated, fetching organizations');
        await fetchOrganisations();
      } else {
        console.log('User not authenticated, clearing organization data');
        setOrganisation(null);
        setOrganizations([]);
        setHasOrganisation(false);
        setIsLoading(false);
      }
    });

    return () => {
      console.log('OrganisationProvider cleanup');
      console.log('Unsubscribing from auth state changes');
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

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
      console.log('switchOrganisation: Starting switch to org ID:', orgId);
      setIsLoading(true);
      
      // Get organization details
      console.log('Fetching organization details');
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', orgId)
        .single();
      
      if (orgError) {
        console.error('Error fetching organization details:', orgError);
        throw orgError;
      }
      
      console.log('Organization details fetched:', orgData);
      // Update current organization
      setOrganisation(orgData);
      
      // Redirect to home page
      console.log('Redirecting to home page');
      navigate('/');
      
      return true;
    } catch (error) {
      console.error("Error switching organization:", error);
      toast.error("Failed to switch organization");
      return false;
    } finally {
      console.log('Setting loading to false after switch');
      setIsLoading(false);
    }
  };

  // Create a new organisation
  const createOrganisation = async (name: string): Promise<boolean> => {
    try {
      console.log('createOrganisation: Starting creation with name:', name);
      setIsLoading(true);
      
      // Check if user is authenticated
      console.log('Checking authentication');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
      }
      
      console.log('Session data:', sessionData);
      if (!sessionData.session) {
        console.log('No active session found');
        toast.error("You must be logged in to create an organisation");
        return false;
      }
      
      // Create organization
      console.log('Creating organization with name:', name);
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .insert([{ name }])
        .select()
        .single();
      
      if (orgError) {
        console.error('Error creating organization:', orgError);
        throw orgError;
      }
      
      console.log('Organization created:', orgData);
      
      // Add user as admin to the organization
      console.log('Adding user as admin. User ID:', sessionData.session.user.id, 'Org ID:', orgData.id);
      const { error: membershipError } = await supabase
        .from('organisation_memberships')
        .insert({
          member_id: sessionData.session.user.id,
          organisation_id: orgData.id,
          role: 'admin'
        });
      
      if (membershipError) {
        console.error('Error creating membership:', membershipError);
        throw membershipError;
      }
      
      console.log('Membership created successfully');
      
      // Update state
      setOrganisation(orgData);
      setHasOrganisation(true);
      setOrganizations(prev => [...prev, orgData]);
      
      toast.success("Organisation created successfully");
      
      // Redirect to home after organization is created
      console.log('Redirecting to home');
      navigate('/');
      
      return true;
    } catch (error) {
      console.error("Error in createOrganisation:", error);
      console.log('Error details:', JSON.stringify(error, null, 2));
      toast.error("Failed to create organisation");
      return false;
    } finally {
      console.log('Setting loading to false after create');
      setIsLoading(false);
    }
  };

  // Update an existing organisation
  const updateOrganisation = async (id: string, updates: Partial<Organisation>): Promise<boolean> => {
    try {
      console.log('updateOrganisation: Starting update for org ID:', id);
      console.log('Updates to apply:', updates);
      setIsLoading(true);
      
      // Check if user is authenticated
      console.log('Checking authentication');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
      }
      
      if (!sessionData.session) {
        console.log('No active session found');
        toast.error("You must be logged in to update the organisation");
        return false;
      }

      console.log('Updating organisation:', { id, updates });
      
      // First verify the user has admin access to this organisation
      console.log('Verifying admin access');
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

      console.log('User role in organization:', membershipData?.role);
      if (membershipData.role !== 'admin') {
        console.error("User does not have admin access to this organisation");
        toast.error("You don't have permission to update this organisation");
        return false;
      }
      
      // Update organisation
      console.log('Updating organization in database');
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (orgError) {
        console.error('Error updating organization:', orgError);
        throw orgError;
      }
      
      console.log('Organization updated:', orgData);
      
      // Update state
      setOrganisation(orgData);
      setOrganizations(prev => prev.map(org => 
        org.id === id ? orgData : org
      ));
      
      toast.success("Organisation updated successfully");
      return true;
    } catch (error) {
      console.error("Error in updateOrganisation:", error);
      console.log('Error details:', JSON.stringify(error, null, 2));
      toast.error("Failed to update organisation");
      return false;
    } finally {
      console.log('Setting loading to false after update');
      setIsLoading(false);
    }
  };

  // Complete setup for new users
  const completeNewUserSetup = async (websiteUrl: string): Promise<boolean> => {
    try {
      console.log('completeNewUserSetup: Starting setup with URL:', websiteUrl);
      setIsLoading(true);
      
      // Check if user is authenticated
      console.log('Checking authentication');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
      }
      
      if (!sessionData.session) {
        console.log('No active session found');
        toast.error("You must be logged in to complete setup");
        return false;
      }

      // Generate organization name from website URL
      const orgName = websiteUrl
        .replace(/^https?:\/\/(www\.)?/, '')
        .split('.')[0]
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      console.log('Creating organization with name:', orgName);
      
      // Create organization
      console.log('Inserting organization into database');
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .insert([{ name: orgName }])
        .select()
        .single();
      
      if (orgError) {
        console.error('Error creating organization:', orgError);
        throw orgError;
      }
      
      console.log('Organization created:', orgData);

      // Add user as admin to the organization
      console.log('Adding user as admin. User ID:', sessionData.session.user.id, 'Org ID:', orgData.id);
      const { error: membershipError } = await supabase
        .from('organisation_memberships')
        .insert({
          member_id: sessionData.session.user.id,
          organisation_id: orgData.id,
          role: 'admin'
        });
      
      if (membershipError) {
        console.error('Error creating organization membership:', membershipError);
        throw membershipError;
      }
      
      console.log('Organization membership created for user:', sessionData.session.user.id);

      // Format website URL properly
      let formattedUrl = websiteUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      console.log('Formatted URL:', formattedUrl);

      // Create website with all required fields
      console.log('Creating website record');
      const { data: websiteData, error: websiteError } = await supabase
        .from('websites')
        .insert({
          url: formattedUrl,
          name: orgName,
          organisation_id: orgData.id,
          language: 'en', // Default language
          enable_ai_image_generation: false, // Default setting
          page_import_limit: 100, // Default limit
          key_content_limit: 20 // Default limit
        })
        .select()
        .single();

      if (websiteError) {
        console.error('Error creating website:', websiteError);
        throw websiteError;
      }

      console.log('Website created:', websiteData);

      // Set the current website ID in localStorage
      console.log('Setting currentWebsiteId in localStorage:', websiteData.id);
      localStorage.setItem('currentWebsiteId', websiteData.id);
      localStorage.setItem('currentWebsiteName', websiteData.name);

      // Update state
      setOrganisation(orgData);
      setHasOrganisation(true);
      setOrganizations(prev => [...prev, orgData]);
      
      toast.success("Setup completed successfully");
      return true;
    } catch (error) {
      console.error("Error in completeNewUserSetup:", error);
      console.log('Error details:', JSON.stringify(error, null, 2));
      toast.error("Failed to complete setup");
      return false;
    } finally {
      console.log('Setting loading to false after setup');
      setIsLoading(false);
    }
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
