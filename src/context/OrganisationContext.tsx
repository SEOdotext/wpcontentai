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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasOrganisation, setHasOrganisation] = useState<boolean>(false);
  const [organizations, setOrganizations] = useState<Organisation[]>([]);
  const navigate = useNavigate();

  // Load the organisation on mount
  useEffect(() => {
    const fetchOrganisation = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          console.log("User not authenticated, cannot fetch organisation");
          setIsLoading(false);
          return;
        }
        
        // Get user's organization memberships
        const { data: memberships, error: membershipError } = await supabase
          .from('organisation_memberships')
          .select(`
            organisation_id,
            role,
            organisation:organisations (
              id,
              name,
              created_at
            )
          `)
          .eq('member_id', sessionData.session.user.id) as { data: OrganisationMembership[] | null, error: any };
        
        if (membershipError) {
          console.error("Error fetching organization memberships:", membershipError);
          console.error("Full error details:", JSON.stringify(membershipError, null, 2));
          setIsLoading(false);
          return;
        }
        
        if (!memberships || memberships.length === 0) {
          console.log("User has no organizations");
          setHasOrganisation(false);
          setIsLoading(false);
          return;
        }
        
        // Set the first organization as the current one
        const currentOrg = {
          id: memberships[0].organisation.id,
          name: memberships[0].organisation.name,
          created_at: memberships[0].organisation.created_at
        } as Organisation;
        setOrganisation(currentOrg);
        setHasOrganisation(true);
        
        // Store all organizations for later use
        setOrganizations(memberships.map(m => ({
          id: m.organisation.id,
          name: m.organisation.name,
          created_at: m.organisation.created_at
        } as Organisation)));
        
      } catch (error) {
        console.error("Error checking organization:", error);
        setHasOrganisation(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrganisation();
  }, []);

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
