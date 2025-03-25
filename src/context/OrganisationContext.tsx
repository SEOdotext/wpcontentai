import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Organisation {
  id: string;
  name: string;
  created_at: string;
}

interface OrganisationContextType {
  organisation: Organisation | null;
  hasOrganisation: boolean;
  isLoading: boolean;
  createOrganisation: (name: string) => Promise<boolean>;
  updateOrganisation: (id: string, updates: Partial<Organisation>) => Promise<boolean>;
}

const OrganisationContext = createContext<OrganisationContextType>({
  organisation: null,
  hasOrganisation: false,
  isLoading: true,
  createOrganisation: async () => false,
  updateOrganisation: async () => false,
});

export const useOrganisation = () => useContext(OrganisationContext);

export const OrganisationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasOrganisation, setHasOrganisation] = useState<boolean>(false);
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
        
        // Get user profile to get the organisation_id
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('organisation_id')
          .eq('id', sessionData.session.user.id)
          .single();
        
        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          console.error("Full error details:", JSON.stringify(profileError, null, 2));
          setIsLoading(false);
          return;
        }
        
        if (!profileData.organisation_id) {
          console.log("User has no organisation");
          setHasOrganisation(false);
          setIsLoading(false);
          return;
        }
        
        // Fetch organisation details
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .select('*')
          .eq('id', profileData.organisation_id)
          .single();
        
        if (orgError) {
          console.error("Error fetching organisation:", orgError);
          console.error("Full error details:", JSON.stringify(orgError, null, 2));
          setHasOrganisation(false);
          setIsLoading(false);
          return;
        }
        
        console.log("Organisation loaded:", orgData);
        setOrganisation(orgData as Organisation);
        setHasOrganisation(true);
      } catch (error) {
        console.error("Error in fetchOrganisation:", error);
        toast.error("Failed to load your organisation data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrganisation();
  }, []);

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
      
      // Create organisation
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .insert({ name })
        .select()
        .single();
      
      if (orgError) {
        console.error("Error creating organisation:", orgError);
        toast.error("Failed to create organisation");
        return false;
      }
      
      // Update user profile with organisation_id
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ organisation_id: orgData.id })
        .eq('id', sessionData.session.user.id);
      
      if (updateError) {
        console.error("Error updating user profile:", updateError);
        toast.error("Failed to link organisation to your profile");
        return false;
      }
      
      setOrganisation(orgData as Organisation);
      setHasOrganisation(true);
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
      
      // First verify the user has access to this organisation
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('organisation_id')
        .eq('id', sessionData.session.user.id)
        .single();

      if (profileError) {
        console.error("Error verifying user access:", profileError);
        toast.error("Failed to verify user access");
        return false;
      }

      if (profileData.organisation_id !== id) {
        console.error("User does not have access to this organisation");
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
      
      if (orgError) {
        console.error("Error updating organisation:", orgError);
        console.error("Full error details:", JSON.stringify(orgError, null, 2));
        toast.error("Failed to update organisation");
        return false;
      }
      
      console.log('Organisation updated successfully:', orgData);
      setOrganisation(orgData as Organisation);
      toast.success("Organisation updated successfully");
      return true;
    } catch (error) {
      console.error("Error in updateOrganisation:", error);
      console.error("Full error details:", JSON.stringify(error, null, 2));
      toast.error("Failed to update organisation");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OrganisationContext.Provider value={{ 
      organisation, 
      hasOrganisation, 
      isLoading, 
      createOrganisation,
      updateOrganisation
    }}>
      {children}
    </OrganisationContext.Provider>
  );
};
