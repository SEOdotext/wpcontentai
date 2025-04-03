import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip"; 
import { OrganisationProvider } from '@/context/OrganisationContext';
import { WordPressProvider } from '@/context/WordPressContext';
import { WebsitesProvider } from '@/context/WebsitesContext';
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
    
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const isLoggedIn = !!data.session;
        console.log('AuthWrapper: Auth check complete, user is', isLoggedIn ? 'authenticated' : 'not authenticated');
        setIsAuthenticated(isLoggedIn);
        
        // If authenticated, still add a small delay to ensure contexts have time to initialize
        if (isLoggedIn) {
          console.log('AuthWrapper: Adding initialization delay for contexts');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('AuthWrapper: Error checking auth:', error);
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

// Protected Route component that checks for organisation setup
const ProtectedRoute = ({ children, requireOrg = true }: { children: React.ReactNode, requireOrg?: boolean }) => {
  const [hasOrganisation, setHasOrganisation] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOrg = async () => {
      if (!requireOrg) {
        setHasOrganisation(true);
        setIsChecking(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setHasOrganisation(false);
          return;
        }

        const { data: memberships, error: membershipError } = await supabase
          .from('organisation_memberships')
          .select('*')
          .eq('member_id', session.user.id);

        if (membershipError) {
          console.error("Error checking organisation memberships:", membershipError);
          setHasOrganisation(false);
        } else {
          setHasOrganisation(memberships && memberships.length > 0);
        }
      } catch (error) {
        console.error("Error checking organisation:", error);
        setHasOrganisation(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkOrg();
  }, [requireOrg]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireOrg && !hasOrganisation) {
    return <Navigate to="/setup" replace />;
  }

  return children;
};

// Auth redirector - redirects logged-in users to dashboard
const AuthRedirector = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log("AuthRedirector: Checking auth state...");
    
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const isLoggedIn = !!data.session;
        console.log("AuthRedirector: Auth check complete, user is", isLoggedIn ? "authenticated" : "not authenticated");
        setIsAuthenticated(isLoggedIn);
      } catch (error) {
        console.error('AuthRedirector: Error checking auth:', error);
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
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <Router>
          <OrganisationProvider>
            <WebsitesProvider>
              <SettingsProvider>
                <PostThemesProvider>
                  <WebsiteContentProvider>
                    <WordPressProvider>
                      <TooltipProvider>
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
                                <ProtectedRoute>
                                  <Index />
                                </ProtectedRoute>
                              </AuthWrapper>
                            </SidebarProvider>
                          } />
                          <Route path="/calendar" element={
                            <SidebarProvider>
                              <AuthWrapper>
                                <ProtectedRoute>
                                  <ContentCalendar />
                                </ProtectedRoute>
                              </AuthWrapper>
                            </SidebarProvider>
                          } />
                          <Route path="/create" element={
                            <SidebarProvider>
                              <AuthWrapper>
                                <ProtectedRoute>
                                  <ContentCreation />
                                </ProtectedRoute>
                              </AuthWrapper>
                            </SidebarProvider>
                          } />
                          <Route path="/settings" element={
                            <SidebarProvider>
                              <AuthWrapper>
                                <ProtectedRoute>
                                  <Settings />
                                </ProtectedRoute>
                              </AuthWrapper>
                            </SidebarProvider>
                          } />
                          <Route path="/organization" element={
                            <SidebarProvider>
                              <AuthWrapper>
                                <ProtectedRoute>
                                  <Organization />
                                </ProtectedRoute>
                              </AuthWrapper>
                            </SidebarProvider>
                          } />
                          <Route path="/setup" element={
                            <SidebarProvider>
                              <AuthWrapper>
                                <ProtectedRoute requireOrg={false}>
                                  <OrganisationSetup />
                                </ProtectedRoute>
                              </AuthWrapper>
                            </SidebarProvider>
                          } />
                          <Route path="/team" element={
                            <SidebarProvider>
                              <AuthWrapper>
                                <ProtectedRoute>
                                  <TeamManagement />
                                </ProtectedRoute>
                              </AuthWrapper>
                            </SidebarProvider>
                          } />
                          <Route path="/websites" element={
                            <SidebarProvider>
                              <AuthWrapper>
                                <ProtectedRoute>
                                  <WebsiteManager />
                                </ProtectedRoute>
                              </AuthWrapper>
                            </SidebarProvider>
                          } />
                          <Route path="/sitemap" element={
                            <SidebarProvider>
                              <AuthWrapper>
                                <ProtectedRoute>
                                  <WebsiteSitemap />
                                </ProtectedRoute>
                              </AuthWrapper>
                            </SidebarProvider>
                          } />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                        <Toaster />
                      </TooltipProvider>
                    </WordPressProvider>
                  </WebsiteContentProvider>
                </PostThemesProvider>
              </SettingsProvider>
            </WebsitesProvider>
          </OrganisationProvider>
        </Router>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App; 