import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip"; 
import { OrganisationProvider, useOrganisation } from '@/context/OrganisationContext';
import { WordPressProvider } from '@/context/WordPressContext';
import { WebsitesProvider, useWebsites } from '@/context/WebsitesContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { PostThemesProvider } from '@/context/PostThemesContext';
import { WebsiteContentProvider } from '@/context/WebsiteContentContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import Auth from '@/pages/Auth';
import Index from '@/pages/Index';
import OrganisationSetup from '@/pages/OrganisationSetup';
import Settings from '@/pages/Settings';
import TeamManagement from '@/pages/TeamManagement';
import LandingPage from '@/pages/LandingPage';
import Onboarding from './pages/Onboarding';
import ContentCalendar from './pages/ContentCalendar';
import ContentCreation from './pages/ContentCreation';
import WebsiteManager from './pages/WebsiteManager';
import WebsiteSitemap from './pages/WebsiteSitemap';
import Organization from './pages/Organization';
import NotFound from './pages/NotFound';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Auth wrapper component
const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log('AuthWrapper: Checking auth state...');
    
    // Start with a timer to ensure minimum loading time
    let timeoutId = setTimeout(() => {
      console.log('AuthWrapper: Minimum loading time elapsed');
      if (!isLoading) return; // Don't do anything if already loaded
      
      // If we're still waiting for auth, show a longer loading message
      const loadingMessage = document.querySelector('.loading-message');
      if (loadingMessage) {
        loadingMessage.textContent = 'Still initializing application...';
      }
    }, 1500);
    
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const isLoggedIn = !!data.session;
        console.log('AuthWrapper: Auth check complete, user is', isLoggedIn ? 'authenticated' : 'not authenticated');
        
        setIsAuthenticated(isLoggedIn);
        
        // If logged in, ensure we wait at least 2 seconds total before rendering
        // This gives contexts time to initialize
        if (isLoggedIn) {
          setTimeout(() => {
            console.log('AuthWrapper: Content initialization complete, rendering now');
            setIsLoading(false);
          }, 2000); // Significantly longer delay to avoid race conditions
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('AuthWrapper: Error checking auth:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthWrapper: Auth state changed, user is', session ? 'authenticated' : 'not authenticated');
      setIsAuthenticated(!!session);
      if (!session) {
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="loading-message text-muted-foreground">Loading application...</p>
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

// Protected Route component that checks for organisation setup
const ProtectedRoute = ({ children, requireOrg = true }: { children: React.ReactNode, requireOrg?: boolean }) => {
  const { hasOrganisation, isLoading: orgLoading } = useOrganisation();
  
  // Skip organization check if not required
  if (!requireOrg) {
    return <>{children}</>;
  }

  // Show loading state while checking
  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Checking organization...</p>
        </div>
      </div>
    );
  }

  // If organization is required but user doesn't have one, redirect to setup
  if (requireOrg && !hasOrganisation) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};

// Auth redirector - redirects logged-in users to dashboard
const AuthRedirector = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const isLoggedIn = !!data.session;
        setIsAuthenticated(isLoggedIn);
      } catch (error) {
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
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Application contexts wrapper
const AppContexts = ({ children }: { children: React.ReactNode }) => {
  return (
    <OrganisationProvider>
      <WebsitesProvider>
        <SettingsProvider>
          <PostThemesProvider>
            <WebsiteContentProvider>
              <WordPressProvider>
                <TooltipProvider>
                  <SidebarProvider>
                    {children}
                    <Toaster />
                  </SidebarProvider>
                </TooltipProvider>
              </WordPressProvider>
            </WebsiteContentProvider>
          </PostThemesProvider>
        </SettingsProvider>
      </WebsitesProvider>
    </OrganisationProvider>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={
              <AuthRedirector>
                <LandingPage />
              </AuthRedirector>
            } />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            
            {/* All protected routes - wrapped in contexts */}
            <Route path="/dashboard" element={
              <AuthWrapper>
                <AppContexts>
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                </AppContexts>
              </AuthWrapper>
            } />
            <Route path="/calendar" element={
              <AuthWrapper>
                <AppContexts>
                  <ProtectedRoute>
                    <ContentCalendar />
                  </ProtectedRoute>
                </AppContexts>
              </AuthWrapper>
            } />
            <Route path="/create" element={
              <AuthWrapper>
                <AppContexts>
                  <ProtectedRoute>
                    <ContentCreation />
                  </ProtectedRoute>
                </AppContexts>
              </AuthWrapper>
            } />
            <Route path="/settings" element={
              <AuthWrapper>
                <AppContexts>
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                </AppContexts>
              </AuthWrapper>
            } />
            <Route path="/organization" element={
              <AuthWrapper>
                <AppContexts>
                  <ProtectedRoute>
                    <Organization />
                  </ProtectedRoute>
                </AppContexts>
              </AuthWrapper>
            } />
            <Route path="/setup" element={
              <AuthWrapper>
                <AppContexts>
                  <ProtectedRoute requireOrg={false}>
                    <OrganisationSetup />
                  </ProtectedRoute>
                </AppContexts>
              </AuthWrapper>
            } />
            <Route path="/team" element={
              <AuthWrapper>
                <AppContexts>
                  <ProtectedRoute>
                    <TeamManagement />
                  </ProtectedRoute>
                </AppContexts>
              </AuthWrapper>
            } />
            <Route path="/team-management" element={
              <AuthWrapper>
                <AppContexts>
                  <ProtectedRoute>
                    <TeamManagement />
                  </ProtectedRoute>
                </AppContexts>
              </AuthWrapper>
            } />
            <Route path="/websites" element={
              <AuthWrapper>
                <AppContexts>
                  <ProtectedRoute>
                    <WebsiteManager />
                  </ProtectedRoute>
                </AppContexts>
              </AuthWrapper>
            } />
            <Route path="/sitemap" element={
              <AuthWrapper>
                <AppContexts>
                  <ProtectedRoute>
                    <WebsiteSitemap />
                  </ProtectedRoute>
                </AppContexts>
              </AuthWrapper>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App; 