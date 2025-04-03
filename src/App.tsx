import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { OrganisationProvider } from '@/context/OrganisationContext';
import { WordPressProvider } from '@/context/WordPressContext';
import { WebsitesProvider } from '@/context/WebsitesContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import Auth from '@/pages/Auth';
import Index from '@/pages/Index';
import OrganisationSetup from '@/pages/OrganisationSetup';
import Settings from '@/pages/Settings';
import TeamManagement from '@/pages/TeamManagement';
import LandingPage from '@/pages/LandingPage';
import Onboarding from './pages/Onboarding';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Auth wrapper component
const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log('AuthWrapper: Checking auth state...');
    
    const checkAuth = async () => {
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 5000)
        );
        
        const authCheckPromise = supabase.auth.getSession();
        
        // Race between auth check and timeout
        const result = await Promise.race([
          authCheckPromise,
          timeoutPromise
        ]) as { data: { session: any } };
        
        const isLoggedIn = !!result.data.session;
        console.log('AuthWrapper: Auth check complete, user is', isLoggedIn ? 'authenticated' : 'not authenticated');
        setIsAuthenticated(isLoggedIn);
        
        // If authenticated, still add a small delay to ensure contexts have time to initialize
        if (isLoggedIn) {
          console.log('AuthWrapper: Adding initialization delay for contexts');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('AuthWrapper: Error checking auth (or timeout):', error);
        setIsAuthenticated(false);
      } finally {
        console.log('AuthWrapper: Setting loading to false');
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('AuthWrapper: Auth state changed, user is', session ? 'authenticated' : 'not authenticated');
      setIsAuthenticated(!!session);
      
      // Add a small delay to ensure contexts have time to initialize
      if (session) {
        console.log('AuthWrapper: Adding initialization delay for contexts');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('AuthWrapper: Not authenticated, redirecting to landing page');
    return <Navigate to="/" replace />;
  }

  console.log('AuthWrapper: User authenticated, showing protected content');
  return <>{children}</>;
};

// Auth redirector - redirects logged-in users to dashboard
const AuthRedirector = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log("AuthRedirector: Checking auth state...");
    
    const checkAuth = async () => {
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 5000)
        );
        
        const authCheckPromise = supabase.auth.getSession();
        
        // Race between auth check and timeout
        const result = await Promise.race([
          authCheckPromise,
          timeoutPromise
        ]) as { data: { session: any } };
        
        const isLoggedIn = !!result.data.session;
        console.log("AuthRedirector: Auth check complete, user is", isLoggedIn ? "authenticated" : "not authenticated");
        setIsAuthenticated(isLoggedIn);
      } catch (error) {
        console.error('AuthRedirector: Error checking auth (or timeout):', error);
        // On error, assume not authenticated and continue
        setIsAuthenticated(false);
      } finally {
        console.log("AuthRedirector: Setting loading to false");
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    console.log("AuthRedirector: Redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  console.log("AuthRedirector: Showing landing page");
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <WebsitesProvider>
        <WordPressProvider>
          <OrganisationProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={
                <AuthRedirector>
                  <LandingPage />
                </AuthRedirector>
              } />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={
                <SidebarProvider>
                  <AuthWrapper>
                    <Index />
                  </AuthWrapper>
                </SidebarProvider>
              } />
              <Route path="/settings" element={
                <SidebarProvider>
                  <AuthWrapper>
                    <Settings />
                  </AuthWrapper>
                </SidebarProvider>
              } />
              <Route path="/setup" element={
                <SidebarProvider>
                  <AuthWrapper>
                    <OrganisationSetup />
                  </AuthWrapper>
                </SidebarProvider>
              } />
              <Route path="/team" element={
                <SidebarProvider>
                  <AuthWrapper>
                    <TeamManagement />
                  </AuthWrapper>
                </SidebarProvider>
              } />
            </Routes>
            <Toaster />
          </OrganisationProvider>
        </WordPressProvider>
      </WebsitesProvider>
    </Router>
  );
}

export default App; 