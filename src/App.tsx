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

// Auth wrapper for protected routes
const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log('AuthWrapper: Checking auth state...');
    
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const isLoggedIn = !!data.session;
        console.log('AuthWrapper: Auth check complete, user is', isLoggedIn ? 'authenticated' : 'not authenticated');
        setIsAuthenticated(isLoggedIn);
      } catch (error) {
        console.error('AuthWrapper: Error checking auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthWrapper: Auth state changed, user is', session ? 'authenticated' : 'not authenticated');
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading authentication...</p>
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

// Check if user is already logged in - for login and landing pages
const PublicRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log("PublicRouteGuard: Checking if user is already logged in...");
    
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsAuthenticated(!!data.session);
      } catch (error) {
        console.error('PublicRouteGuard: Error checking auth:', error);
        setIsAuthenticated(false);
      } finally {
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
    console.log("PublicRouteGuard: User is logged in, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  console.log("PublicRouteGuard: User is not logged in, showing public content");
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes - NO auth check needed */}
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Public routes - Redirect to Dashboard if already logged in */}
        <Route path="/" element={
          <PublicRouteGuard>
            <LandingPage />
          </PublicRouteGuard>
        } />
        <Route path="/auth" element={
          <PublicRouteGuard>
            <Auth />
          </PublicRouteGuard>
        } />
        
        {/* Protected routes - Wrapped in providers and auth check */}
        <Route path="/dashboard" element={
          <OrganisationProvider>
            <WebsitesProvider>
              <WordPressProvider>
                <SidebarProvider>
                  <AuthWrapper>
                    <Index />
                  </AuthWrapper>
                </SidebarProvider>
              </WordPressProvider>
            </WebsitesProvider>
          </OrganisationProvider>
        } />
        <Route path="/settings" element={
          <OrganisationProvider>
            <WebsitesProvider>
              <WordPressProvider>
                <SidebarProvider>
                  <AuthWrapper>
                    <Settings />
                  </AuthWrapper>
                </SidebarProvider>
              </WordPressProvider>
            </WebsitesProvider>
          </OrganisationProvider>
        } />
        <Route path="/setup" element={
          <OrganisationProvider>
            <WebsitesProvider>
              <WordPressProvider>
                <SidebarProvider>
                  <AuthWrapper>
                    <OrganisationSetup />
                  </AuthWrapper>
                </SidebarProvider>
              </WordPressProvider>
            </WebsitesProvider>
          </OrganisationProvider>
        } />
        <Route path="/team" element={
          <OrganisationProvider>
            <WebsitesProvider>
              <WordPressProvider>
                <SidebarProvider>
                  <AuthWrapper>
                    <TeamManagement />
                  </AuthWrapper>
                </SidebarProvider>
              </WordPressProvider>
            </WebsitesProvider>
          </OrganisationProvider>
        } />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App; 