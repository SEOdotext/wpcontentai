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
    
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const isLoggedIn = !!data.session;
        console.log('AuthWrapper: Auth check complete, user is', isLoggedIn ? 'authenticated' : 'not authenticated');
        setIsAuthenticated(isLoggedIn);
        setIsLoading(false);
      } catch (error) {
        console.error('AuthWrapper: Error checking auth:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
          <p className="text-muted-foreground">Checking authentication...</p>
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
  const { isLoading: websitesLoading } = useWebsites();
  
  // We only care if organization context is loading when requireOrg is true
  const isLoading = requireOrg ? orgLoading : false;
  
  useEffect(() => {
    console.log('ProtectedRoute: Checking organization status');
    console.log(`ProtectedRoute: requireOrg=${requireOrg}, hasOrganisation=${hasOrganisation}, orgLoading=${orgLoading}, websitesLoading=${websitesLoading}`);
  }, [requireOrg, hasOrganisation, orgLoading, websitesLoading]);

  // Skip organization check if not required
  if (!requireOrg) {
    console.log('ProtectedRoute: Organization check not required, proceeding');
    return <>{children}</>;
  }

  // Show loading state while checking
  if (isLoading) {
    console.log('ProtectedRoute: Organization data still loading');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading organization data...</p>
        </div>
      </div>
    );
  }

  // If organization is required but user doesn't have one, redirect to setup
  if (requireOrg && !hasOrganisation) {
    console.log('ProtectedRoute: No organization found, redirecting to setup');
    return <Navigate to="/setup" replace />;
  }

  console.log('ProtectedRoute: Organization check passed, rendering content');
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
              <Routes>
                {/* Public routes */}
                <Route path="/" element={
                  <AuthRedirector>
                    <LandingPage />
                  </AuthRedirector>
                } />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                
                {/* Protected routes - Moved the remaining context providers inside routes */}
                <Route path="/dashboard" element={
                  <AuthWrapper>
                    <ProtectedRoute>
                      <SettingsProvider>
                        <PostThemesProvider>
                          <WebsiteContentProvider>
                            <WordPressProvider>
                              <TooltipProvider>
                                <SidebarProvider>
                                  <Index />
                                </SidebarProvider>
                              </TooltipProvider>
                            </WordPressProvider>
                          </WebsiteContentProvider>
                        </PostThemesProvider>
                      </SettingsProvider>
                    </ProtectedRoute>
                  </AuthWrapper>
                } />
                <Route path="/calendar" element={
                  <AuthWrapper>
                    <ProtectedRoute>
                      <SettingsProvider>
                        <PostThemesProvider>
                          <WebsiteContentProvider>
                            <WordPressProvider>
                              <TooltipProvider>
                                <SidebarProvider>
                                  <ContentCalendar />
                                </SidebarProvider>
                              </TooltipProvider>
                            </WordPressProvider>
                          </WebsiteContentProvider>
                        </PostThemesProvider>
                      </SettingsProvider>
                    </ProtectedRoute>
                  </AuthWrapper>
                } />
                <Route path="/create" element={
                  <AuthWrapper>
                    <ProtectedRoute>
                      <SettingsProvider>
                        <PostThemesProvider>
                          <WebsiteContentProvider>
                            <WordPressProvider>
                              <TooltipProvider>
                                <SidebarProvider>
                                  <ContentCreation />
                                </SidebarProvider>
                              </TooltipProvider>
                            </WordPressProvider>
                          </WebsiteContentProvider>
                        </PostThemesProvider>
                      </SettingsProvider>
                    </ProtectedRoute>
                  </AuthWrapper>
                } />
                <Route path="/settings" element={
                  <AuthWrapper>
                    <ProtectedRoute>
                      <SettingsProvider>
                        <PostThemesProvider>
                          <WebsiteContentProvider>
                            <WordPressProvider>
                              <TooltipProvider>
                                <SidebarProvider>
                                  <Settings />
                                </SidebarProvider>
                              </TooltipProvider>
                            </WordPressProvider>
                          </WebsiteContentProvider>
                        </PostThemesProvider>
                      </SettingsProvider>
                    </ProtectedRoute>
                  </AuthWrapper>
                } />
                <Route path="/organization" element={
                  <AuthWrapper>
                    <ProtectedRoute>
                      <SettingsProvider>
                        <PostThemesProvider>
                          <WebsiteContentProvider>
                            <WordPressProvider>
                              <TooltipProvider>
                                <SidebarProvider>
                                  <Organization />
                                </SidebarProvider>
                              </TooltipProvider>
                            </WordPressProvider>
                          </WebsiteContentProvider>
                        </PostThemesProvider>
                      </SettingsProvider>
                    </ProtectedRoute>
                  </AuthWrapper>
                } />
                <Route path="/setup" element={
                  <AuthWrapper>
                    <ProtectedRoute requireOrg={false}>
                      <SettingsProvider>
                        <PostThemesProvider>
                          <WebsiteContentProvider>
                            <WordPressProvider>
                              <TooltipProvider>
                                <SidebarProvider>
                                  <OrganisationSetup />
                                </SidebarProvider>
                              </TooltipProvider>
                            </WordPressProvider>
                          </WebsiteContentProvider>
                        </PostThemesProvider>
                      </SettingsProvider>
                    </ProtectedRoute>
                  </AuthWrapper>
                } />
                <Route path="/team" element={
                  <AuthWrapper>
                    <ProtectedRoute>
                      <SettingsProvider>
                        <PostThemesProvider>
                          <WebsiteContentProvider>
                            <WordPressProvider>
                              <TooltipProvider>
                                <SidebarProvider>
                                  <TeamManagement />
                                </SidebarProvider>
                              </TooltipProvider>
                            </WordPressProvider>
                          </WebsiteContentProvider>
                        </PostThemesProvider>
                      </SettingsProvider>
                    </ProtectedRoute>
                  </AuthWrapper>
                } />
                <Route path="/team-management" element={
                  <AuthWrapper>
                    <ProtectedRoute>
                      <SettingsProvider>
                        <PostThemesProvider>
                          <WebsiteContentProvider>
                            <WordPressProvider>
                              <TooltipProvider>
                                <SidebarProvider>
                                  <TeamManagement />
                                </SidebarProvider>
                              </TooltipProvider>
                            </WordPressProvider>
                          </WebsiteContentProvider>
                        </PostThemesProvider>
                      </SettingsProvider>
                    </ProtectedRoute>
                  </AuthWrapper>
                } />
                <Route path="/websites" element={
                  <AuthWrapper>
                    <ProtectedRoute>
                      <SettingsProvider>
                        <PostThemesProvider>
                          <WebsiteContentProvider>
                            <WordPressProvider>
                              <TooltipProvider>
                                <SidebarProvider>
                                  <WebsiteManager />
                                </SidebarProvider>
                              </TooltipProvider>
                            </WordPressProvider>
                          </WebsiteContentProvider>
                        </PostThemesProvider>
                      </SettingsProvider>
                    </ProtectedRoute>
                  </AuthWrapper>
                } />
                <Route path="/sitemap" element={
                  <AuthWrapper>
                    <ProtectedRoute>
                      <SettingsProvider>
                        <PostThemesProvider>
                          <WebsiteContentProvider>
                            <WordPressProvider>
                              <TooltipProvider>
                                <SidebarProvider>
                                  <WebsiteSitemap />
                                </SidebarProvider>
                              </TooltipProvider>
                            </WordPressProvider>
                          </WebsiteContentProvider>
                        </PostThemesProvider>
                      </SettingsProvider>
                    </ProtectedRoute>
                  </AuthWrapper>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </WebsitesProvider>
          </OrganisationProvider>
        </Router>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App; 