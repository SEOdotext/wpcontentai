import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip"; 
import { OrganisationProvider, useOrganisation } from '@/context/OrganisationContext';
import { WordPressProvider } from '@/context/WordPressContext';
import { WebsitesProvider, useWebsites } from '@/context/WebsitesContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { PostThemesProvider } from '@/context/PostThemesContext';
import { WebsiteContentProvider } from '@/context/WebsiteContentContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
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
  const { isAuthenticated, isLoading, isOnboarding } = useAuth();
  const location = useLocation();

  console.log('AuthWrapper: Rendering with state:', { 
    isAuthenticated, 
    isLoading, 
    isOnboarding,
    path: location.pathname 
  });

  // Always allow access to auth and onboarding paths
  if (location.pathname === '/auth' || location.pathname === '/onboarding') {
    console.log('AuthWrapper: Allowing access to public path:', location.pathname);
    return <>{children}</>;
  }

  // Show loading state only during initial check
  if (isLoading) {
    console.log('AuthWrapper: Showing loading state during initial auth check');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="loading-message text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  // Allow access during onboarding
  if (isOnboarding) {
    console.log('AuthWrapper: User is in onboarding, allowing access');
    return <>{children}</>;
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    console.log('AuthWrapper: User not authenticated, redirecting to auth page');
    return <Navigate to="/auth" replace />;
  }

  console.log('AuthWrapper: User authenticated, showing protected content');
  return <>{children}</>;
};

// Protected Route component that checks for organisation setup
const ProtectedRoute = ({ children, requireOrg = true }: { children: React.ReactNode, requireOrg?: boolean }) => {
  const { hasOrganisation, isLoading: orgLoading, organisation } = useOrganisation();
  const { currentWebsite, isLoading: websitesLoading } = useWebsites();
  const [forceShowContent, setForceShowContent] = useState(false);
  const [redirectToSetup, setRedirectToSetup] = useState(false);
  const location = useLocation();
  
  // Check localStorage to see if we're in onboarding or have cached data
  const hasCachedOrg = !!localStorage.getItem('currentOrganisation');
  const hasCachedWebsite = !!localStorage.getItem('currentWebsiteId');
  const isOnboarding = !!localStorage.getItem('website_info') || !!localStorage.getItem('pending_signup');
  const isOnboardingPath = location.pathname === '/onboarding';
  
  // Safety timeout - if org loading takes too long, force-show content
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (orgLoading || websitesLoading) {
        console.log('Organization loading state persisted too long, showing content anyway');
        setForceShowContent(true);
      }
    }, 3000);
    
    return () => clearTimeout(safetyTimer);
  }, [orgLoading, websitesLoading]);
  
  // After a delay, if we're sure the user has no org, redirect to setup
  useEffect(() => {
    // Only start this check if we're past loading, requiring an org, and not in onboarding
    if (!orgLoading && !websitesLoading && requireOrg && !isOnboarding && !isOnboardingPath) {
      const setupCheckTimer = setTimeout(() => {
        // If we definitely have no org data or website data after loading is complete
        if (!hasOrganisation && !currentWebsite && !hasCachedOrg && !hasCachedWebsite) {
          console.log('Confirmed user has no organization, redirecting to setup');
          setRedirectToSetup(true);
        }
      }, 1000);
      
      return () => clearTimeout(setupCheckTimer);
    }
  }, [orgLoading, websitesLoading, hasOrganisation, currentWebsite, hasCachedOrg, hasCachedWebsite, requireOrg, isOnboarding, isOnboardingPath]);
  
  // Skip checks if not required or during onboarding
  if (!requireOrg || isOnboarding || isOnboardingPath) {
    console.log('Skipping organization check:', { requireOrg, isOnboarding, isOnboardingPath });
    return <>{children}</>;
  }

  // Redirect to setup if we're sure the user needs onboarding
  if (redirectToSetup) {
    return <Navigate to="/setup" replace />;
  }

  // Only show loading for a brief period, and only on first load
  if (orgLoading && !currentWebsite && !hasCachedOrg && !hasCachedWebsite && !forceShowContent && !isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Checking organization...</p>
        </div>
      </div>
    );
  }

  // Show content immediately in all other cases
  return <>{children}</>;
};

// Auth redirector - redirects logged-in users to dashboard
const AuthRedirector = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, isOnboarding } = useAuth();
  const { hasOrganisation } = useOrganisation();
  const location = useLocation();
  const navigate = useNavigate();

  // Check for onboarding completion parameters
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const params = new URLSearchParams(location.search);
      const onboardingComplete = params.get('onboarding') === 'complete';
      const transferData = params.get('transfer') === 'true';
      
      if (onboardingComplete && transferData) {
        console.log('AuthRedirector: Detected onboarding completion parameters');
        const userId = supabase.auth.getUser().then(({ data }) => {
          if (data?.user?.id) {
            console.log('AuthRedirector: Transferring data for user:', data.user.id);
            import('@/api/onboardingImport').then(({ transferDataToDatabase }) => {
              transferDataToDatabase(data.user.id).catch(error => {
                console.error('Error transferring data:', error);
              });
            });
          }
        });
      }
    }
  }, [isAuthenticated, isLoading, location.search]);

  console.log('AuthRedirector: Rendering with state:', {
    isAuthenticated,
    isLoading,
    isOnboarding,
    hasOrganisation,
    path: location.pathname
  });

  if (isLoading) {
    console.log('AuthRedirector: Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !isOnboarding && hasOrganisation && location.pathname === '/') {
    console.log('AuthRedirector: Authenticated user with organization on landing page, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('AuthRedirector: Showing content for', isAuthenticated ? 'authenticated' : 'unauthenticated', 'user');
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
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<AuthRedirector><LandingPage /></AuthRedirector>} />
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
          </AuthProvider>
        </Router>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App; 