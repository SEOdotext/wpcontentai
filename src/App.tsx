import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

const queryClient = new QueryClient();

// Protected Route component that checks for organisation setup
const ProtectedRoute = ({ children, requireOrg = true }: { children: React.ReactNode, requireOrg?: boolean }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasOrganisation, setHasOrganisation] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsChecking(true);
        
        // Check if user is logged in
        const { data: sessionData } = await supabase.auth.getSession();
        const isLoggedIn = !!sessionData.session;
        setIsAuthenticated(isLoggedIn);
        
        if (isLoggedIn && requireOrg) {
          // Check if user has an organisation
          const { data: userData, error } = await supabase
            .from('user_profiles')
            .select('organisation_id')
            .eq('id', sessionData.session!.user.id)
            .single();
          
          if (error) {
            console.error("Error checking user profile:", error);
            setHasOrganisation(false);
          } else {
            setHasOrganisation(!!userData.organisation_id);
          }
        }
      } catch (error) {
        console.error("Error in auth check:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session);
      
      if (session && requireOrg) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('organisation_id')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.error("Error checking user profile:", error);
            setHasOrganisation(false);
          } else {
            setHasOrganisation(!!data.organisation_id);
          }
        } catch (error) {
          console.error("Error in auth state change:", error);
          setHasOrganisation(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [requireOrg]);

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requireOrg && !hasOrganisation) {
    return <Navigate to="/setup" replace />;
  }

  return children;
};

const App = () => (
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
);

export default App;
