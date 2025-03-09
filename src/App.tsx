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
import { SettingsProvider } from "./context/SettingsContext";
import { WebsitesProvider } from "./context/WebsitesContext";
import { OrganisationProvider } from "./context/OrganisationContext";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import { SidebarProvider } from "./components/ui/sidebar";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected Route component that checks for organisation setup
const ProtectedRoute = ({ children, requireOrg = true }: { children: React.ReactNode, requireOrg?: boolean }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasOrganisation, setHasOrganisation] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        console.log('Checking auth...');
        // Check if user is logged in
        const { data: sessionData } = await supabase.auth.getSession();
        const isLoggedIn = !!sessionData.session;
        console.log('Is logged in:', isLoggedIn);
        
        if (!isMounted) return;
        setIsAuthenticated(isLoggedIn);
        
        if (isLoggedIn && requireOrg) {
          console.log('Checking organization...');
          // Check if user has an organisation
          const { data: userData, error } = await supabase
            .from('user_profiles')
            .select('organisation_id')
            .eq('id', sessionData.session!.user.id)
            .single();
          
          if (!isMounted) return;
          
          if (error) {
            console.error("Error checking user profile:", error);
            setHasOrganisation(false);
          } else {
            const hasOrg = !!userData?.organisation_id;
            console.log('Has organization:', hasOrg);
            setHasOrganisation(hasOrg);
          }
        } else if (!requireOrg) {
          setHasOrganisation(true);
        }
      } catch (error) {
        console.error("Error in auth check:", error);
        if (!isMounted) return;
        setIsAuthenticated(false);
        setHasOrganisation(false);
      } finally {
        if (!isMounted) return;
        setIsChecking(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      console.log('Auth state changed:', !!session);
      setIsAuthenticated(!!session);
      
      if (session && requireOrg) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('organisation_id')
            .eq('id', session.user.id)
            .single();
          
          if (!isMounted) return;
          
          if (error) {
            console.error("Error checking user profile:", error);
            setHasOrganisation(false);
          } else {
            const hasOrg = !!data?.organisation_id;
            console.log('Has organization (after auth change):', hasOrg);
            setHasOrganisation(hasOrg);
          }
        } catch (error) {
          console.error("Error in auth state change:", error);
          if (!isMounted) return;
          setHasOrganisation(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [requireOrg]);

  // Only show loading state for a brief moment
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

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  if (requireOrg && !hasOrganisation) {
    console.log('No organization, redirecting to /setup');
    return <Navigate to="/setup" replace />;
  }

  return children;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OrganisationProvider>
          <WebsitesProvider>
            <SettingsProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  <Route path="/auth" element={<Auth />} />
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
                  <Route path="/websites" element={
                    <ProtectedRoute>
                      <SidebarProvider>
                        <WebsiteManager />
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
            </SettingsProvider>
          </WebsitesProvider>
        </OrganisationProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
