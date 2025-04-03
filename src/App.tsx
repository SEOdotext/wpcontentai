import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { OrganisationProvider } from '@/context/OrganisationContext';
import { WordPressProvider } from '@/context/WordPressContext';
import { WebsitesProvider } from '@/context/WebsitesContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import Auth from '@/pages/Auth';
import Index from '@/pages/Index';
import OrganisationSetup from '@/pages/OrganisationSetup';
import Settings from '@/pages/Settings';
import TeamManagement from '@/pages/TeamManagement';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Auth wrapper component
const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('AuthWrapper session check:', session);
        setIsAuthenticated(!!session);
        
        // Add a small delay to ensure contexts have time to initialize
        if (session) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed in AuthWrapper:', session);
      setIsAuthenticated(!!session);
      
      // Add a small delay to ensure contexts have time to initialize
      if (session) {
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
    return <Navigate to="/auth" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <OrganisationProvider>
        <WebsitesProvider>
          <WordPressProvider>
            <SidebarProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/setup" element={
                  <AuthWrapper>
                    <OrganisationSetup />
                  </AuthWrapper>
                } />
                <Route path="/" element={
                  <AuthWrapper>
                    <Index />
                  </AuthWrapper>
                } />
                <Route path="/settings" element={
                  <AuthWrapper>
                    <Settings />
                  </AuthWrapper>
                } />
                <Route path="/team" element={
                  <AuthWrapper>
                    <TeamManagement />
                  </AuthWrapper>
                } />
              </Routes>
              <Toaster />
            </SidebarProvider>
          </WordPressProvider>
        </WebsitesProvider>
      </OrganisationProvider>
    </Router>
  );
}

export default App;
