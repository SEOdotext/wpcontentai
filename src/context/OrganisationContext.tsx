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
    
    const fetchOrganisations = async () => {
      try {
        setIsLoading(true);
        console.log('Starting to fetch organizations...');
        
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Session data in fetchOrganisations:', sessionData);
        
        if (!sessionData.session) {
          console.log('No session found, setting loading to false');
          setOrganisation(null);
          setOrganizations([]);
          setHasOrganisation(false);
          setIsLoading(false);
          return;
        }

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
          throw error;
        }

        console.log('Organizations fetched:', orgs);
        if (orgs && orgs.length > 0) {
          const formattedOrgs = orgs.map(org => ({
            id: org.organisation.id,
            name: org.organisation.name,
            created_at: org.organisation.created_at
          } as Organisation));
          
          setOrganizations(formattedOrgs);
          setOrganisation(formattedOrgs[0]);
          setHasOrganisation(true);
        } else {
          console.log('No organizations found for user');
          setHasOrganisation(false);
        }
      } catch (error) {
        console.error("Error fetching organisations:", error);
        toast.error("Failed to load organizations");
        setHasOrganisation(false);
      } finally {
        console.log('Setting loading to false');
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchOrganisations();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', session ? 'authenticated' : 'not authenticated');
      if (session) {
        await fetchOrganisations();
      } else {
        setOrganisation(null);
        setOrganizations([]);
        setHasOrganisation(false);
        setIsLoading(false);
      }
    });

    return () => {
      console.log('OrganisationProvider cleanup');
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
      setIsLoading(true);
      
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
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

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .insert([{ name: orgName }])
        .select()
        .single();
      
      if (orgError) throw orgError;

      // Create user profile if it doesn't exist
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: sessionData.session.user.id,
          email: sessionData.session.user.email,
          role: 'admin'
        });
      
      if (profileError) throw profileError;

      // Add user as admin to the organization
      const { error: membershipError } = await supabase
        .from('organisation_memberships')
        .insert({
          member_id: sessionData.session.user.id,
          organisation_id: orgData.id,
          role: 'admin'
        });
      
      if (membershipError) throw membershipError;

      // Create website
      const { data: websiteData, error: websiteError } = await supabase
        .from('websites')
        .insert({
          url: websiteUrl.trim(),
          name: orgName,
          organisation_id: orgData.id
        })
        .select()
        .single();

      if (websiteError) throw websiteError;

      // Set the current website ID in localStorage
      console.log('Setting currentWebsiteId in localStorage:', websiteData.id);
      localStorage.setItem('currentWebsiteId', websiteData.id);

      // Update state
      setOrganisation(orgData);
      setHasOrganisation(true);
      setOrganizations(prev => [...prev, orgData]);
      
      toast.success("Setup completed successfully");
      return true;
    } catch (error) {
      console.error("Error in completeNewUserSetup:", error);
      toast.error("Failed to complete setup");
      return false;
    } finally {
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
