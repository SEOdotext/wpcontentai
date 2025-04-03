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
    
    // Always have a minimum loading time to ensure contexts have time to initialize
    let timeoutId = setTimeout(() => {
      console.log('AuthWrapper: Minimum loading time elapsed, validating contexts');
      // Only show content after a minimum loading period
      setIsLoading(false);
    }, 1500);
    
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const isLoggedIn = !!data.session;
        console.log('AuthWrapper: Auth check complete, user is', isLoggedIn ? 'authenticated' : 'not authenticated');
        setIsAuthenticated(isLoggedIn);
      } catch (error) {
        console.error('AuthWrapper: Error checking auth:', error);
        setIsAuthenticated(false);
        setIsLoading(false); // On error, show content immediately
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthWrapper: Auth state changed, user is', session ? 'authenticated' : 'not authenticated');
      setIsAuthenticated(!!session);
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
          <p className="loading-message text-muted-foreground">Initializing application...</p>
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
        console.log('AuthRedirector: Auth check complete, user is', isLoggedIn ? 'authenticated' : 'not authenticated');
        setIsAuthenticated(isLoggedIn);
      } catch (error) {
        console.error('AuthRedirector: Error checking auth:', error);
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
    console.log('AuthRedirector: User is authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('AuthRedirector: User is not authenticated, showing landing page');
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
        <Router basename="/">
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
              <AppContexts>
                <AuthWrapper>
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                </AuthWrapper>
              </AppContexts>
            } />
            <Route path="/calendar" element={
              <AppContexts>
                <AuthWrapper>
                  <ProtectedRoute>
                    <ContentCalendar />
                  </ProtectedRoute>
                </AuthWrapper>
              </AppContexts>
            } />
            <Route path="/create" element={
              <AppContexts>
                <AuthWrapper>
                  <ProtectedRoute>
                    <ContentCreation />
                  </ProtectedRoute>
                </AuthWrapper>
              </AppContexts>
            } />
            <Route path="/settings" element={
              <AppContexts>
                <AuthWrapper>
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                </AuthWrapper>
              </AppContexts>
            } />
            <Route path="/organization" element={
              <AppContexts>
                <AuthWrapper>
                  <ProtectedRoute>
                    <Organization />
                  </ProtectedRoute>
                </AuthWrapper>
              </AppContexts>
            } />
            <Route path="/setup" element={
              <AppContexts>
                <AuthWrapper>
                  <ProtectedRoute requireOrg={false}>
                    <OrganisationSetup />
                  </ProtectedRoute>
                </AuthWrapper>
              </AppContexts>
            } />
            <Route path="/team" element={
              <AppContexts>
                <AuthWrapper>
                  <ProtectedRoute>
                    <TeamManagement />
                  </ProtectedRoute>
                </AuthWrapper>
              </AppContexts>
            } />
            <Route path="/team-management" element={
              <AppContexts>
                <AuthWrapper>
                  <ProtectedRoute>
                    <TeamManagement />
                  </ProtectedRoute>
                </AuthWrapper>
              </AppContexts>
            } />
            <Route path="/websites" element={
              <AppContexts>
                <AuthWrapper>
                  <ProtectedRoute>
                    <WebsiteManager />
                  </ProtectedRoute>
                </AuthWrapper>
              </AppContexts>
            } />
            <Route path="/sitemap" element={
              <AppContexts>
                <AuthWrapper>
                  <ProtectedRoute>
                    <WebsiteSitemap />
                  </ProtectedRoute>
                </AuthWrapper>
              </AppContexts>
            } />
            
            {/* Support for /app/* routes to handle redirects from old URLs */}
            <Route path="/app/dashboard" element={<Navigate to="/dashboard" replace />} />
            <Route path="/app/calendar" element={<Navigate to="/calendar" replace />} />
            <Route path="/app/create" element={<Navigate to="/create" replace />} />
            <Route path="/app/settings" element={<Navigate to="/settings" replace />} />
            <Route path="/app/organization" element={<Navigate to="/organization" replace />} />
            <Route path="/app/setup" element={<Navigate to="/setup" replace />} />
            <Route path="/app/team" element={<Navigate to="/team" replace />} />
            <Route path="/app/team-management" element={<Navigate to="/team-management" replace />} />
            <Route path="/app/websites" element={<Navigate to="/websites" replace />} />
            <Route path="/app/sitemap" element={<Navigate to="/sitemap" replace />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App; 