
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ContentStructureView from '@/components/ContentStructureView';
import { Toaster } from "@/components/ui/sonner";
import { useWebsites } from '@/context/WebsitesContext';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe } from 'lucide-react';

const ContentCreation = () => {
  const { currentWebsite, isLoading } = useWebsites();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">
              {currentWebsite && (
                <Alert className="bg-muted/50 border-muted">
                  <Globe className="h-4 w-4" />
                  <AlertDescription>
                    Creating content for <strong>{currentWebsite.name}</strong>
                  </AlertDescription>
                </Alert>
              )}
              <ContentStructureView className="min-h-[600px]" />
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
};

export default ContentCreation;
