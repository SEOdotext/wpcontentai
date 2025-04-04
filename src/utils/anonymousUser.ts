import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

// Types that mirror our database structure
export interface AnonymousOrganisation {
  id: string;
  name: string;
  created_at: string;
}

export interface AnonymousWebsite {
  id: string;
  url: string;
  name: string;
  organisation_id: string;
  language: string;
  enable_ai_image_generation: boolean;
  page_import_limit: number;
  key_content_limit: number;
  created_at: string;
}

export interface AnonymousOnboarding {
  id: string;
  website_id: string;
  website_indexing: boolean;
  keyword_suggestions: boolean;
  post_ideas: boolean;
  client_thumbs: boolean;
  status: string;
  created_at: string;
}

export interface AnonymousUser {
  id: string;
  created_at: string;
  organisation?: AnonymousOrganisation;
  website?: AnonymousWebsite;
  onboarding?: AnonymousOnboarding;
}

// LocalStorage keys
const ANONYMOUS_USER_KEY = 'anonymous_user';
const CURRENT_WEBSITE_ID_KEY = 'currentWebsiteId';
const CURRENT_WEBSITE_NAME_KEY = 'currentWebsiteName';

// Helper to get current timestamp in ISO format
const getCurrentTimestamp = (): string => new Date().toISOString();

// Initialize anonymous user in localStorage
export const initAnonymousUser = (): AnonymousUser => {
  const anonymousUser: AnonymousUser = {
    id: uuidv4(),
    created_at: getCurrentTimestamp()
  };
  
  localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(anonymousUser));
  return anonymousUser;
};

// Get anonymous user from localStorage
export const getAnonymousUser = (): AnonymousUser | null => {
  const userData = localStorage.getItem(ANONYMOUS_USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

// Check if anonymous user exists
export const hasAnonymousUser = (): boolean => {
  return !!localStorage.getItem(ANONYMOUS_USER_KEY);
};

// Create organization for anonymous user
export const createAnonymousOrganisation = (name: string): AnonymousOrganisation => {
  const user = getAnonymousUser() || initAnonymousUser();
  
  const organisation: AnonymousOrganisation = {
    id: uuidv4(),
    name,
    created_at: getCurrentTimestamp()
  };
  
  user.organisation = organisation;
  localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(user));
  
  return organisation;
};

// Create website for anonymous user
export const createAnonymousWebsite = (url: string, name: string): AnonymousWebsite | null => {
  const user = getAnonymousUser();
  if (!user || !user.organisation) return null;
  
  const website: AnonymousWebsite = {
    id: uuidv4(),
    url,
    name,
    organisation_id: user.organisation.id,
    language: 'en',
    enable_ai_image_generation: false,
    page_import_limit: 100,
    key_content_limit: 20,
    created_at: getCurrentTimestamp()
  };
  
  user.website = website;
  localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(user));
  
  // Set current website ID in localStorage for compatibility with existing code
  localStorage.setItem(CURRENT_WEBSITE_ID_KEY, website.id);
  localStorage.setItem(CURRENT_WEBSITE_NAME_KEY, website.name);
  
  return website;
};

// Create onboarding entry for anonymous user
export const createAnonymousOnboarding = (): AnonymousOnboarding | null => {
  const user = getAnonymousUser();
  if (!user || !user.website) return null;
  
  const onboarding: AnonymousOnboarding = {
    id: uuidv4(),
    website_id: user.website.id,
    website_indexing: false,
    keyword_suggestions: false,
    post_ideas: false,
    client_thumbs: false,
    status: 'pending',
    created_at: getCurrentTimestamp()
  };
  
  user.onboarding = onboarding;
  localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(user));
  
  return onboarding;
};

// Update onboarding status
export const updateAnonymousOnboarding = (updates: Partial<AnonymousOnboarding>): AnonymousOnboarding | null => {
  const user = getAnonymousUser();
  if (!user || !user.onboarding) return null;
  
  user.onboarding = {
    ...user.onboarding,
    ...updates
  };
  
  localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(user));
  return user.onboarding;
};

// Clear anonymous user data
export const clearAnonymousUser = (): void => {
  localStorage.removeItem(ANONYMOUS_USER_KEY);
};

// Complete anonymous user setup from website URL
export const completeAnonymousUserSetup = (websiteUrl: string): { 
  websiteId: string; 
  organisationId: string;
  onboardingId: string;
} | null => {
  try {
    // Generate organization name from website URL
    const orgName = websiteUrl
      .replace(/^https?:\/\/(www\.)?/, '')
      .split('.')[0]
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Format website URL properly
    let formattedUrl = websiteUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    // Create organization
    const organisation = createAnonymousOrganisation(orgName);
    
    // Create website
    const website = createAnonymousWebsite(formattedUrl, orgName);
    if (!website) return null;
    
    // Create onboarding
    const onboarding = createAnonymousOnboarding();
    if (!onboarding) return null;
    
    return {
      organisationId: organisation.id,
      websiteId: website.id,
      onboardingId: onboarding.id
    };
  } catch (error) {
    console.error('Error in completeAnonymousUserSetup:', error);
    return null;
  }
};

// Migrate anonymous user data to database when user signs up
export const migrateAnonymousUserToDB = async (): Promise<boolean> => {
  try {
    // Check if anonymous user exists
    const anonymousUser = getAnonymousUser();
    if (!anonymousUser) {
      console.log('No anonymous user data to migrate');
      return false;
    }
    
    // Check if user is authenticated
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.error('No authenticated user to migrate data to');
      return false;
    }
    
    const userId = sessionData.session.user.id;
    console.log('Migrating anonymous user data to DB for user:', userId);
    
    // 1. Migrate organisation
    if (!anonymousUser.organisation) {
      console.error('No organisation data to migrate');
      return false;
    }
    
    console.log('Migrating organisation:', anonymousUser.organisation.name);
    const { data: orgData, error: orgError } = await supabase
      .from('organisations')
      .insert([{ 
        name: anonymousUser.organisation.name 
      }])
      .select()
      .single();
    
    if (orgError) {
      console.error('Error migrating organisation:', orgError);
      return false;
    }
    
    console.log('Organisation migrated successfully:', orgData);
    
    // 2. Create organisation membership
    const { error: membershipError } = await supabase
      .from('organisation_memberships')
      .insert({
        member_id: userId,
        organisation_id: orgData.id,
        role: 'admin'
      });
    
    if (membershipError) {
      console.error('Error creating organisation membership:', membershipError);
      return false;
    }
    
    console.log('Organisation membership created successfully');
    
    // 3. Migrate website
    if (!anonymousUser.website) {
      console.error('No website data to migrate');
      return false;
    }
    
    console.log('Migrating website:', anonymousUser.website.url);
    const { data: websiteData, error: websiteError } = await supabase
      .from('websites')
      .insert({
        url: anonymousUser.website.url,
        name: anonymousUser.website.name,
        organisation_id: orgData.id,
        language: anonymousUser.website.language,
        enable_ai_image_generation: anonymousUser.website.enable_ai_image_generation,
        page_import_limit: anonymousUser.website.page_import_limit,
        key_content_limit: anonymousUser.website.key_content_limit
      })
      .select()
      .single();
    
    if (websiteError) {
      console.error('Error migrating website:', websiteError);
      return false;
    }
    
    console.log('Website migrated successfully:', websiteData);
    
    // 4. Migrate onboarding
    if (!anonymousUser.onboarding) {
      console.log('No onboarding data to migrate, creating new entry');
    }
    
    // Create or update onboarding entry
    console.log('Migrating onboarding data for website:', websiteData.id);
    const { data: onboardingData, error: onboardingError } = await supabase.functions.invoke(
      'create-onboarding-entry',
      {
        method: 'POST',
        body: { website_id: websiteData.id }
      }
    );
    
    if (onboardingError) {
      console.error('Error creating onboarding entry:', onboardingError);
      // Non-critical error, continue with setup
    } else {
      console.log('Onboarding entry created successfully:', onboardingData);
      
      // If we have status data, update it
      if (anonymousUser.onboarding) {
        const { error: updateError } = await supabase
          .from('onboarding')
          .update({
            website_indexing: anonymousUser.onboarding.website_indexing,
            keyword_suggestions: anonymousUser.onboarding.keyword_suggestions,
            post_ideas: anonymousUser.onboarding.post_ideas,
            client_thumbs: anonymousUser.onboarding.client_thumbs,
            status: anonymousUser.onboarding.status
          })
          .eq('id', onboardingData.id);
        
        if (updateError) {
          console.error('Error updating onboarding status:', updateError);
          // Non-critical error, continue with setup
        } else {
          console.log('Onboarding status updated successfully');
        }
      }
    }
    
    // Update localStorage with real IDs
    localStorage.setItem('currentWebsiteId', websiteData.id);
    localStorage.setItem('currentWebsiteName', websiteData.name);
    
    // Clear anonymous user data
    clearAnonymousUser();
    
    return true;
  } catch (error) {
    console.error('Error migrating anonymous user data:', error);
    return false;
  }
}; 