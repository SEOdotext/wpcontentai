
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { WebsitesProvider } from '@/context/WebsitesContext';
import { SidebarProvider } from '@/components/ui/sidebar';

// Pages
import Index from '@/pages/Index';
import ContentCreation from '@/pages/ContentCreation';
import WebsiteSitemap from '@/pages/WebsiteSitemap';
import ContentCalendar from '@/pages/ContentCalendar';
import Settings from '@/pages/Settings';
import WebsiteManager from '@/pages/WebsiteManager';
import OrganisationSetup from '@/pages/OrganisationSetup';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebsitesProvider>
        <SidebarProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/create" element={<ContentCreation />} />
            <Route path="/sitemap" element={<WebsiteSitemap />} />
            <Route path="/calendar" element={<ContentCalendar />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/websites" element={<WebsiteManager />} />
            <Route path="/setup" element={<OrganisationSetup />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </SidebarProvider>
      </WebsitesProvider>
    </QueryClientProvider>
  );
}

export default App;
