
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ContentCalendar from "./pages/ContentCalendar";
import ContentCreation from "./pages/ContentCreation";
import Settings from "./pages/Settings";
import WebsiteManager from "./pages/WebsiteManager";
import NotFound from "./pages/NotFound";
import { SettingsProvider } from "./context/SettingsContext";
import { WebsitesProvider } from "./context/WebsitesContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WebsitesProvider>
      <SettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/calendar" element={<ContentCalendar />} />
              <Route path="/create" element={<ContentCreation />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/websites" element={<WebsiteManager />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
    </WebsitesProvider>
  </QueryClientProvider>
);

export default App;
