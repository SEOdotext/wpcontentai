import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
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
import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Simple Auth Guard - Redirects to /auth if not authenticated
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    
    // Shorter timeout for faster response
    const safetyTimer = setTimeout(() => {
      if (isMounted && isLoading) {
        console.log('AuthGuard: Safety timeout triggered, assuming not authenticated');
        setIsLoading(false);
        setIsAuthenticated(false);
        navigate('/auth', { replace: true });
      }
    }, 2000); // Reduced from 3000 to 2000

    const checkAuth = async () => {
      try {
        console.log('AuthGuard: Checking auth state...');
        const { data, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('AuthGuard: Error checking auth:', error);
          setIsAuthenticated(false);
          setIsLoading(false);
          navigate('/auth', { replace: true });
          return;
        }
        
        const isLoggedIn = !!data.session;
        console.log('AuthGuard: User is', isLoggedIn ? 'authenticated' : 'not authenticated');
        
        if (!isLoggedIn) {
          setIsAuthenticated(false);
          setIsLoading(false);
          navigate('/auth', { replace: true });
          return;
        }
        
        // User is authenticated, immediately set loading to false
        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (error) {
        if (!isMounted) return;
        console.error('AuthGuard: Error in auth check:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
        navigate('/auth', { replace: true });
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        console.log('AuthGuard: Auth state changed:', _event);
        
        if (session) {
          setIsAuthenticated(true);
          setIsLoading(false);
        } else if (location.pathname !== '/auth') {
          setIsAuthenticated(false);
          setIsLoading(false);
          navigate('/auth', { replace: true });
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

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
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Protected Route component that checks for organisation setup
const ProtectedRoute = ({ children, requireOrg = true }: { children: React.ReactNode, requireOrg?: boolean }) => {
  const [hasOrganisation, setHasOrganisation] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    console.log('ProtectedRoute: Checking organization status. requireOrg:', requireOrg);
    
    // Add safety timeout to prevent getting stuck
    const safetyTimer = setTimeout(() => {
      if (isMounted && isChecking) {
        console.log('ProtectedRoute: Safety timeout triggered');
        setIsChecking(false);
        setHasOrganisation(false);
        if (requireOrg) {
          navigate('/setup', { replace: true });
        }
      }
    }, 3000);
    
    const checkOrg = async () => {
      if (!requireOrg) {
        console.log('ProtectedRoute: Organization check not required, skipping');
        setHasOrganisation(true);
        setIsChecking(false);
        return;
      }

      try {
        console.log('ProtectedRoute: Getting session data');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (sessionError) {
          console.error('ProtectedRoute: Session error:', sessionError);
          setHasOrganisation(false);
          setIsChecking(false);
          return;
        }
        
        const session = sessionData.session;
        
        if (!session) {
          console.log('ProtectedRoute: No active session found');
          setHasOrganisation(false);
          setIsChecking(false);
          return;
        }

        console.log('ProtectedRoute: Checking organization memberships for user');
        
        const { data: memberships, error: membershipError } = await supabase
          .from('organisation_memberships')
          .select('*')
          .eq('member_id', session.user.id);

        if (!isMounted) return;
        
        if (membershipError) {
          console.error("ProtectedRoute: Error checking organisation memberships:", membershipError);
          setHasOrganisation(false);
          setIsChecking(false);
          navigate('/setup', { replace: true });
          return;
        } 
        
        console.log('ProtectedRoute: Organization memberships found:', memberships?.length || 0);
        
        const hasOrg = memberships && memberships.length > 0;
        setHasOrganisation(hasOrg);
        
        if (!hasOrg && requireOrg) {
          console.log('ProtectedRoute: No organizations found, redirecting to setup');
          navigate('/setup', { replace: true });
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("ProtectedRoute: Error checking organisation:", error);
        setHasOrganisation(false);
        navigate('/setup', { replace: true });
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkOrg();
    
    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [requireOrg, navigate]);

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

  return <>{children}</>;
};

// Auth redirector - redirects logged-in users to dashboard
const AuthRedirector = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    console.log("AuthRedirector: Checking auth state...");
    
    // Add safety timeout
    const safetyTimer = setTimeout(() => {
      if (isMounted && isLoading) {
        console.log('AuthRedirector: Safety timeout triggered');
        setIsLoading(false);
      }
    }, 3000);
    
    const checkAuth = async () => {
      try {
        console.log('AuthRedirector: Starting auth check');
        const { data, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('AuthRedirector: Session error:', error);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        const isLoggedIn = !!data.session;
        console.log("AuthRedirector: User is", isLoggedIn ? "authenticated" : "not authenticated");
        
        if (!isLoggedIn) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        setIsAuthenticated(true);
        setIsLoading(false);
        
        console.log('AuthRedirector: User is authenticated, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      } catch (error) {
        if (!isMounted) return;
        console.error('AuthRedirector: Error checking auth:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [navigate]);

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

// Nested layout for protected routes
const ProtectedLayout = () => {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        console.log('ProtectedLayout: Checking auth');
        const { data, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('ProtectedLayout: Auth error:', error);
          navigate('/auth', { replace: true });
          return;
        }
        
        if (!data.session) {
          console.log('ProtectedLayout: No session found, redirecting to auth');
          navigate('/auth', { replace: true });
          return;
        }
        
        console.log('ProtectedLayout: User authenticated, rendering protected content');
        setIsChecking(false);
      } catch (error) {
        if (!isMounted) return;
        console.error('ProtectedLayout: Auth check error:', error);
        navigate('/auth', { replace: true });
      }
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      console.log('ProtectedLayout: Auth state changed:', event);
      
      if (!session && event === 'SIGNED_OUT') {
        console.log('ProtectedLayout: User signed out, redirecting to auth');
        navigate('/auth', { replace: true });
      }
    });
    
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);
  
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <OrganisationProvider>
      <WebsitesProvider>
        <SettingsProvider>
          <PostThemesProvider>
            <WebsiteContentProvider>
              <WordPressProvider>
                <SidebarProvider>
                  <Outlet />
                </SidebarProvider>
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
          <TooltipProvider>
            <Toaster />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={
                <AuthRedirector>
                  <LandingPage />
                </AuthRedirector>
              } />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Protected routes with shared layout */}
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<Index />} />
                <Route path="/calendar" element={<ContentCalendar />} />
                <Route path="/create" element={<ContentCreation />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/organization" element={<Organization />} />
                <Route path="/setup" element={<OrganisationSetup />} />
                <Route path="/team" element={<TeamManagement />} />
                <Route path="/team-management" element={<TeamManagement />} />
                <Route path="/websites" element={<WebsiteManager />} />
                <Route path="/sitemap" element={<WebsiteSitemap />} />
              </Route>
              
              {/* Catch-all route for 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </Router>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App; 