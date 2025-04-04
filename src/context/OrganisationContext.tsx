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
      console.log('=== SETUP PROCESS STARTED ===');
      console.log('Input website URL:', websiteUrl);
      setIsLoading(true);
      
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Auth session check result:', sessionData.session ? 'User is logged in' : 'No session found');
      
      if (!sessionData.session) {
        console.error('No auth session found');
        toast.error("You must be logged in to complete setup");
        return false;
      }

      const userId = sessionData.session.user.id;
      const isAnonymous = sessionData.session.user.user_metadata?.is_anonymous === true;
      console.log('User authenticated, ID:', userId, 'Anonymous:', isAnonymous);
      
      // Log all user metadata for debugging
      console.log('User metadata:', sessionData.session.user.user_metadata);
      console.log('User email:', sessionData.session.user.email);

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

      // Create an entry in the onboarding table
      console.log('=== STEP 4: Creating onboarding entry ===');
      try {
        console.log('Invoking create-onboarding-entry function with website_id:', websiteData.id);
        const { data: onboardingData, error: onboardingError } = await supabase.functions.invoke(
          'create-onboarding-entry',
          {
            method: 'POST',
            body: { website_id: websiteData.id }
          }
        );

        if (onboardingError) {
          console.error('Error creating onboarding entry:', onboardingError);
          console.error('Error details:', JSON.stringify(onboardingError, null, 2));
          // Non-critical error, continue with setup
        } else {
          console.log('Onboarding entry created successfully:', onboardingData);
        }
      } catch (onboardingErr) {
        console.error('Exception creating onboarding entry:', onboardingErr);
        console.error('Exception details:', JSON.stringify(onboardingErr, null, 2));
        // Non-critical error, continue with setup
      }

      // Update state
      console.log('=== STEP 5: Updating application state ===');
      const updatedOrg = {
        id: orgData.id,
        name: orgData.name,
        created_at: orgData.created_at
      };
      
      setOrganisation(updatedOrg);
      setHasOrganisation(true);
      setOrganizations(prev => [...prev, updatedOrg]);
      
      console.log('=== SETUP PROCESS COMPLETED SUCCESSFULLY ===');
      toast.success("Setup completed successfully");
      return true;
    } catch (error) {
      console.error("=== SETUP PROCESS FAILED ===");
      console.error("Error in completeNewUserSetup:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
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
        toast.error("Failed to complete setup");
      }
      
      return false;
    } finally {
      console.log('Setting isLoading to false');
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
