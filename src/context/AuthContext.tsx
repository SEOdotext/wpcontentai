import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboarding: boolean;
  checkAuth: () => Promise<void>;
  user: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions for localStorage operations
const getStoredAuthState = () => {
  const storedState = localStorage.getItem('last_auth_state');
  console.log('AuthContext: Retrieved stored auth state from localStorage:', storedState || 'none');
  return storedState;
};

const setStoredAuthState = (state: string | null) => {
  if (state) {
    console.log('AuthContext: Storing auth state in localStorage:', state);
    localStorage.setItem('last_auth_state', state);
  } else {
    console.log('AuthContext: Removing auth state from localStorage');
    localStorage.removeItem('last_auth_state');
  }
};

const getStoredAuthTokens = () => {
  const accessToken = localStorage.getItem('supabase.auth.token');
  const refreshToken = localStorage.getItem('supabase.auth.refresh_token');
  console.log('AuthContext: Retrieved stored auth tokens from localStorage:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken
  });
  return { accessToken, refreshToken };
};

const setStoredAuthTokens = (accessToken: string | null, refreshToken: string | null) => {
  if (accessToken) {
    console.log('AuthContext: Storing access token in localStorage');
    localStorage.setItem('supabase.auth.token', accessToken);
  } else {
    console.log('AuthContext: Removing access token from localStorage');
    localStorage.removeItem('supabase.auth.token');
  }
  
  if (refreshToken) {
    console.log('AuthContext: Storing refresh token in localStorage');
    localStorage.setItem('supabase.auth.refresh_token', refreshToken);
  } else {
    console.log('AuthContext: Removing refresh token from localStorage');
    localStorage.removeItem('supabase.auth.refresh_token');
  }
};

const clearStoredAuthData = () => {
  console.log('AuthContext: Clearing all stored auth data from localStorage');
  localStorage.removeItem('supabase.auth.token');
  localStorage.removeItem('supabase.auth.refresh_token');
  localStorage.removeItem('last_auth_state');
  localStorage.removeItem('auth_complete');
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  // Check if we have onboarding data in localStorage
  useEffect(() => {
    const websiteInfo = localStorage.getItem('website_info');
    const pendingSignup = localStorage.getItem('pending_signup');
    
    // Only set isOnboarding if we have data in localStorage
    if (websiteInfo || pendingSignup) {
      console.log('AuthContext: Found onboarding data in localStorage');
      setIsOnboarding(true);
    } else {
      console.log('AuthContext: No onboarding data found in localStorage');
      setIsOnboarding(false);
    }
  }, []);

  // Add this after the initial useEffect that checks onboarding data
  useEffect(() => {
    // Check for valid org and website in localStorage
    const currentOrgId = localStorage.getItem('currentOrgId') || localStorage.getItem('current_organisation_id');
    const currentWebsiteId = localStorage.getItem('currentWebsiteId') || localStorage.getItem('website_id');
    const onboardingData = localStorage.getItem('website_info') || localStorage.getItem('pending_signup');

    if (currentOrgId && currentWebsiteId && onboardingData) {
      // User has completed onboarding, clear onboarding data
      localStorage.removeItem('website_info');
      localStorage.removeItem('pending_signup');
      setIsOnboarding(false);
      console.log('AuthContext: Cleared onboarding data after detecting valid org and website');
    }
  }, [
    localStorage.getItem('currentOrgId'),
    localStorage.getItem('current_organisation_id'),
    localStorage.getItem('currentWebsiteId'),
    localStorage.getItem('website_id'),
    localStorage.getItem('website_info'),
    localStorage.getItem('pending_signup')
  ]);

  // Handle onboarding data transfer
  const transferOnboardingData = useCallback(async () => {
    if (!user) {
      console.log('AuthContext: No user found for data transfer');
      return;
    }

    const websiteInfo = localStorage.getItem('website_info');
    const pendingSignup = localStorage.getItem('pending_signup');
    
    if (!websiteInfo && !pendingSignup) {
      console.log('AuthContext: No onboarding data to transfer');
      return;
    }

    console.log('AuthContext: Starting onboarding data transfer');
    
    try {
      // Get the current session to ensure we have the latest token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('AuthContext: Error getting session for data transfer:', sessionError);
        throw sessionError;
      }
      
      if (!sessionData.session) {
        console.error('AuthContext: No active session found for data transfer');
        throw new Error('No active session');
      }

      // Parse stored data
      const parsedWebsiteInfo = websiteInfo ? JSON.parse(websiteInfo) : null;
      const parsedOrgInfo = localStorage.getItem('organisation_info') ? JSON.parse(localStorage.getItem('organisation_info')!) : null;
      const parsedPendingSignup = pendingSignup ? JSON.parse(pendingSignup) : null;
      const parsedPublicationSettings = localStorage.getItem('publication_settings') ? JSON.parse(localStorage.getItem('publication_settings')!) : {
        posting_frequency: 3,
        posting_days: [{ day: 'monday', count: 1 }, { day: 'wednesday', count: 1 }, { day: 'friday', count: 1 }],
        writing_style: 'Professional and informative',
        subject_matters: []
      };

      // Parse and format website content data
      const parsedWebsiteContent = localStorage.getItem('website_content') ? JSON.parse(localStorage.getItem('website_content')!) : [];

      const parsedKeyContentPages = localStorage.getItem('key_content_pages') ? JSON.parse(localStorage.getItem('key_content_pages')!) : [];
      const parsedScrapedContent = localStorage.getItem('scraped_content') ? JSON.parse(localStorage.getItem('scraped_content')!) : [];
      
      // Call the handle-user-onboarding function with both apikey and authorization headers
      const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/handle-user-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': sessionData.session.access_token,
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          userId: user.id,
          websiteInfo: parsedWebsiteInfo,
          organisationInfo: parsedOrgInfo || {
            name: parsedWebsiteInfo?.name || 'My Organisation',
            website_id: parsedWebsiteInfo?.id
          },
          publicationSettings: parsedPublicationSettings,
          contentData: {
            websiteContent: parsedWebsiteContent,
            keyContentPages: parsedKeyContentPages,
            scrapedContent: parsedScrapedContent
          },
          pendingSignup: parsedPendingSignup
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('AuthContext: Edge function error response:', errorText);
        throw new Error(`Failed to transfer data: ${response.statusText} (${response.status})`);
      }
      
      const result = await response.json();
      console.log('AuthContext: Data transfer successful', result);
      
      // Clear onboarding data from localStorage
      localStorage.removeItem('website_info');
      localStorage.removeItem('pending_signup');
      localStorage.removeItem('pending_user_id');
      localStorage.removeItem('website_content');
      localStorage.removeItem('key_content_pages');
      localStorage.removeItem('scraped_content');
      localStorage.removeItem('publication_settings');
      localStorage.removeItem('organisation_info');
      
      // Update onboarding state
      setIsOnboarding(false);

      // Wait for state update before navigating
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Remove URL parameters and navigate
      window.history.replaceState({}, '', '/dashboard');
      navigate('/dashboard', { replace: true });

      return result;
    } catch (error) {
      console.error('AuthContext: Error transferring onboarding data:', error);
      throw error;
    }
  }, [user, navigate]);

  // Check for onboarding completion parameters
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const params = new URLSearchParams(window.location.search);
      const onboardingComplete = params.get('onboarding') === 'complete';
      const transferData = params.get('transfer') === 'true';
      
      if (onboardingComplete && transferData) {
        console.log('AuthContext: Detected onboarding completion parameters, transferring data');
        // Remove URL parameters to prevent re-triggering
        window.history.replaceState({}, '', '/dashboard');
        // Transfer data
        transferOnboardingData().then(() => {
          // Clear onboarding state after successful transfer
          setIsOnboarding(false);
          // Navigate to dashboard without the parameters
          navigate('/dashboard', { replace: true });
        });
      }
    }
  }, [isAuthenticated, isLoading, transferOnboardingData, navigate]);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    console.log('AuthContext: Checking authentication status');
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('AuthContext: Error getting session:', error);
        throw error;
      }
      
      console.log('AuthContext: Session data retrieved:', !!data.session);
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setIsAuthenticated(true);
        
        // Check for onboarding data in localStorage
        const websiteInfo = localStorage.getItem('website_info');
        const pendingSignup = localStorage.getItem('pending_signup');
        
        if (websiteInfo || pendingSignup) {
          console.log('AuthContext: Found onboarding data in localStorage during auth check');
          setIsOnboarding(true);
        } else {
          console.log('AuthContext: No onboarding data found in localStorage during auth check');
          setIsOnboarding(false);
        }
      } else {
        console.log('AuthContext: No active session found');
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsOnboarding(false);
      }
    } catch (error) {
      console.error('AuthContext: Error in checkAuth:', error);
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    console.log('AuthContext: Setting up auth state change listener');
    let timeoutId: NodeJS.Timeout;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event, !!session);
      
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Debounce the state changes
      timeoutId = setTimeout(() => {
        if (event === 'SIGNED_IN') {
          console.log('AuthContext: User signed in');
          setSession(session);
          setUser(session?.user || null);
          setIsAuthenticated(true);
          
          // Check for onboarding data in localStorage
          const websiteInfo = localStorage.getItem('website_info');
          const pendingSignup = localStorage.getItem('pending_signup');
          
          if (websiteInfo || pendingSignup) {
            console.log('AuthContext: Found onboarding data in localStorage after sign in');
            setIsOnboarding(true);
          } else {
            console.log('AuthContext: No onboarding data found in localStorage after sign in');
            setIsOnboarding(false);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthContext: User signed out');
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
          setIsOnboarding(false);
        }
      }, 100); // 100ms debounce
    });
    
    // Initial auth check
    checkAuth();
    
    return () => {
      console.log('AuthContext: Cleaning up auth state change listener');
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, [checkAuth]);

  // Store tokens in localStorage
  const storeTokens = useCallback((accessToken: string, refreshToken: string) => {
    console.log('AuthContext: Storing tokens in localStorage');
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }, []);

  // Clear tokens from localStorage
  const clearTokens = useCallback(() => {
    console.log('AuthContext: Clearing tokens from localStorage');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    console.log('AuthContext: Logging out user');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      clearTokens();
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsOnboarding(false);
      
      console.log('AuthContext: User logged out successfully');
      navigate('/auth');
    } catch (error) {
      console.error('AuthContext: Error during logout:', error);
    }
  }, [clearTokens, navigate]);

  // Log state changes
  useEffect(() => {
    console.log('AuthContext: State updated:', {
      isAuthenticated,
      isLoading,
      isOnboarding
    });
  }, [isAuthenticated, isLoading, isOnboarding]);

  // Log when the provider is mounted and unmounted
  useEffect(() => {
    console.log('AuthContext: Provider mounted');
    return () => {
      console.log('AuthContext: Provider unmounted');
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, isOnboarding, checkAuth, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('AuthContext: useAuth hook used outside of AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 