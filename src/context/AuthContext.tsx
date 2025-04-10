import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboarding: boolean;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const navigate = useNavigate();

  const checkAuth = async () => {
    try {
      console.log('AuthContext: Checking auth state...');
      
      // First check if we're in onboarding flow
      const onboardingData = localStorage.getItem('website_info');
      const pendingSignup = localStorage.getItem('pending_signup');
      const isOnboardingPath = window.location.pathname === '/onboarding';
      
      if (isOnboardingPath || onboardingData || pendingSignup) {
        console.log('AuthContext: In onboarding flow');
        setIsOnboarding(true);
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Then check for active session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('AuthContext: Session check error:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      if (session) {
        console.log('AuthContext: Found active session');
        localStorage.setItem('supabase.auth.token', session.access_token);
        localStorage.setItem('supabase.auth.refresh_token', session.refresh_token || '');
        localStorage.setItem('last_auth_state', 'authenticated');
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        console.log('AuthContext: No active session');
        if (!isOnboardingPath) {
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('supabase.auth.refresh_token');
          localStorage.removeItem('last_auth_state');
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('AuthContext: Error checking auth:', error);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted && isLoading) {
        console.log('AuthContext: Safety timeout reached, forcing state update');
        setIsLoading(false);
        setIsAuthenticated(false);
      }
    }, 5000);

    checkAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('AuthContext: User signed in');
        const pendingSignup = localStorage.getItem('pending_signup');
        
        if (pendingSignup) {
          console.log('AuthContext: Found pending signup');
          try {
            const { userId } = JSON.parse(pendingSignup);
            localStorage.setItem('auth_complete', 'true');
            setIsAuthenticated(true);
            setIsLoading(false);
          } catch (error) {
            console.error('AuthContext: Error handling pending signup:', error);
          }
        } else {
          setIsAuthenticated(true);
          setIsLoading(false);
        }
        
        localStorage.setItem('supabase.auth.token', session.access_token);
        localStorage.setItem('supabase.auth.refresh_token', session.refresh_token || '');
        localStorage.setItem('last_auth_state', 'authenticated');
      } else if (event === 'SIGNED_OUT') {
        console.log('AuthContext: User signed out');
        if (!isOnboarding) {
          setIsAuthenticated(false);
          setIsLoading(false);
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('supabase.auth.refresh_token');
          localStorage.removeItem('last_auth_state');
          localStorage.removeItem('auth_complete');
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, isOnboarding, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 