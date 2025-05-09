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
import { AdminProvider } from '@/context/AdminContext';
import Auth from '@/pages/Auth';
import AuthCallback from '@/pages/AuthCallback';
import ResetPassword from '@/pages/ResetPassword';
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
import Organisation from './pages/Organisation';
import NotFound from './pages/NotFound';
import Admin from './pages/Admin';
import Pricing from './pages/Pricing';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async';
import GoogleTagManager from '@/components/GoogleTagManager';
import GDPRConsentBanner from '@/components/GDPRConsentBanner';
import ScrollToTop from '@/components/ScrollToTop';
import Media from './pages/Media';

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
const AppContexts = ({ children, withSidebar = true }: { children: React.ReactNode, withSidebar?: boolean }) => {
  return (
    <AuthProvider>
      <AdminProvider>
        <OrganisationProvider>
          <WebsitesProvider>
            <SettingsProvider>
              <PostThemesProvider>
                <WebsiteContentProvider>
                  {withSidebar ? (
                    <SidebarProvider>
                      <TooltipProvider>
                        <Toaster />
                        {children}
                      </TooltipProvider>
                    </SidebarProvider>
                  ) : (
                    <TooltipProvider>
                      <Toaster />
                      {children}
                    </TooltipProvider>
                  )}
                </WebsiteContentProvider>
              </PostThemesProvider>
            </SettingsProvider>
          </WebsitesProvider>
        </OrganisationProvider>
      </AdminProvider>
    </AuthProvider>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <GoogleTagManager />
        <Router basename="/">
          <ScrollToTop />
          <AppContexts withSidebar={false}>
            <Routes>
              <Route path="/auth" element={<AuthRedirector><Auth /></AuthRedirector>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/setup" element={<AuthWrapper><OrganisationSetup /></AuthWrapper>} />
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Routes with sidebar */}
              <Route path="/*" element={
                <AppContexts withSidebar={true}>
                  <Routes>
                    <Route path="/admin/*" element={<AuthWrapper><Admin /></AuthWrapper>} />
                    <Route path="/dashboard" element={
                      <AuthWrapper>
                        <ProtectedRoute>
                          <Index />
                        </ProtectedRoute>
                      </AuthWrapper>
                    } />
                    <Route path="/calendar" element={
                      <AuthWrapper>
                        <ProtectedRoute>
                          <ContentCalendar />
                        </ProtectedRoute>
                      </AuthWrapper>
                    } />
                    <Route path="/create" element={
                      <AuthWrapper>
                        <ProtectedRoute>
                          <ContentCreation />
                        </ProtectedRoute>
                      </AuthWrapper>
                    } />
                    <Route path="/settings" element={
                      <AuthWrapper>
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      </AuthWrapper>
                    } />
                    <Route path="/organisation" element={
                      <AuthWrapper>
                        <ProtectedRoute>
                          <Organisation />
                        </ProtectedRoute>
                      </AuthWrapper>
                    } />
                    <Route path="/team" element={
                      <AuthWrapper>
                        <ProtectedRoute>
                          <TeamManagement />
                        </ProtectedRoute>
                      </AuthWrapper>
                    } />
                    <Route path="/team-management" element={
                      <AuthWrapper>
                        <ProtectedRoute>
                          <TeamManagement />
                        </ProtectedRoute>
                      </AuthWrapper>
                    } />
                    <Route path="/websites" element={
                      <AuthWrapper>
                        <ProtectedRoute>
                          <WebsiteManager />
                        </ProtectedRoute>
                      </AuthWrapper>
                    } />
                    <Route path="/sitemap" element={
                      <AuthWrapper>
                        <ProtectedRoute>
                          <WebsiteSitemap />
                        </ProtectedRoute>
                      </AuthWrapper>
                    } />
                    <Route path="/media" element={
                      <AuthWrapper>
                        <ProtectedRoute>
                          <Media />
                        </ProtectedRoute>
                      </AuthWrapper>
                    } />
                    
                    {/* Support for /app/* routes to handle redirects from old URLs */}
                    <Route path="/app/dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/app/calendar" element={<Navigate to="/calendar" replace />} />
                    <Route path="/app/create" element={<Navigate to="/create" replace />} />
                    <Route path="/app/settings" element={<Navigate to="/settings" replace />} />
                    <Route path="/app/organisation" element={<Navigate to="/organisation" replace />} />
                    <Route path="/app/setup" element={<Navigate to="/setup" replace />} />
                    <Route path="/app/team" element={<Navigate to="/team" replace />} />
                    <Route path="/app/team-management" element={<Navigate to="/team-management" replace />} />
                    <Route path="/app/websites" element={<Navigate to="/websites" replace />} />
                    <Route path="/app/sitemap" element={<Navigate to="/sitemap" replace />} />
                    
                    {/* Catch-all route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppContexts>
              } />
            </Routes>
          </AppContexts>
        </Router>
        <GDPRConsentBanner />
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App; 