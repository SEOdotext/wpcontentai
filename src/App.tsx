import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import Index from "./pages/Index";
import ContentCalendar from "./pages/ContentCalendar";
import ContentCreation from "./pages/ContentCreation";
import Settings from "./pages/Settings";
import WebsiteManager from "./pages/WebsiteManager";
import WebsiteSitemap from "./pages/WebsiteSitemap";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import OrganisationSetup from "./pages/OrganisationSetup";
import Organization from "./pages/Organization";
import { SettingsProvider } from "./context/SettingsContext";
import { WebsitesProvider } from "./context/WebsitesContext";
import { OrganisationProvider } from "./context/OrganisationContext";
import { PostThemesProvider } from "./context/PostThemesContext";
import { WebsiteContentProvider } from "./context/WebsiteContentContext";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import { SidebarProvider } from "./components/ui/sidebar";
import { Loader2 } from "lucide-react";
import TeamManagement from "./pages/TeamManagement";

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
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
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
    return <Navigate to="/auth" replace />;
  }

  return children;
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

        const { data: memberships, error } = await supabase
          .from('organization_memberships')
          .select('organisation_id')
          .eq('user_id', session.user.id);

        if (error) {
          console.error("Error checking organization memberships:", error);
          setHasOrganisation(false);
        } else {
          setHasOrganisation(memberships && memberships.length > 0);
        }
      } catch (error) {
        console.error("Error checking organization:", error);
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

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/*" element={
            <AuthWrapper>
              <OrganisationProvider>
                <WebsitesProvider>
                  <SettingsProvider>
                    <PostThemesProvider>
                      <WebsiteContentProvider>
                        <TooltipProvider>
                          <Toaster />
                          <Sonner />
                          <Routes>
                            <Route path="/setup" element={
                              <ProtectedRoute requireOrg={false}>
                                <SidebarProvider>
                                  <OrganisationSetup />
                                </SidebarProvider>
                              </ProtectedRoute>
                            } />
                            <Route path="/" element={
                              <ProtectedRoute>
                                <SidebarProvider>
                                  <Index />
                                </SidebarProvider>
                              </ProtectedRoute>
                            } />
                            <Route path="/calendar" element={
                              <ProtectedRoute>
                                <SidebarProvider>
                                  <ContentCalendar />
                                </SidebarProvider>
                              </ProtectedRoute>
                            } />
                            <Route path="/create" element={
                              <ProtectedRoute>
                                <SidebarProvider>
                                  <ContentCreation />
                                </SidebarProvider>
                              </ProtectedRoute>
                            } />
                            <Route path="/settings" element={
                              <ProtectedRoute>
                                <SidebarProvider>
                                  <Settings />
                                </SidebarProvider>
                              </ProtectedRoute>
                            } />
                            <Route path="/organization" element={
                              <ProtectedRoute>
                                <SidebarProvider>
                                  <Organization />
                                </SidebarProvider>
                              </ProtectedRoute>
                            } />
                            <Route path="/websites" element={
                              <ProtectedRoute>
                                <SidebarProvider>
                                  <WebsiteManager />
                                </SidebarProvider>
                              </ProtectedRoute>
                            } />
                            <Route path="/team-management" element={
                              <ProtectedRoute>
                                <SidebarProvider>
                                  <TeamManagement />
                                </SidebarProvider>
                              </ProtectedRoute>
                            } />
                            <Route path="/sitemap" element={
                              <ProtectedRoute>
                                <SidebarProvider>
                                  <WebsiteSitemap />
                                </SidebarProvider>
                              </ProtectedRoute>
                            } />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </TooltipProvider>
                      </WebsiteContentProvider>
                    </PostThemesProvider>
                  </SettingsProvider>
                </WebsitesProvider>
              </OrganisationProvider>
            </AuthWrapper>
          } />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
