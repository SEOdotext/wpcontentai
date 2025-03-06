
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ContentStructureView from '@/components/ContentStructureView';
import { Toaster } from "@/components/ui/sonner";
import { useWebsites } from '@/context/WebsitesContext';
import { useSettings } from '@/context/SettingsContext';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Globe, Calendar, PenTool } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

const ContentCreation = () => {
  const { currentWebsite } = useWebsites();
  const { writingStyle, subjectMatters, isLoading } = useSettings();

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
                  <Globe className="h-4 w-4 mr-2" />
                  <div className="flex flex-col space-y-1">
                    <AlertDescription className="flex items-center">
                      Creating content for <strong className="ml-1">{currentWebsite.name}</strong>
                    </AlertDescription>
                    
                    {isLoading ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="flex items-center gap-1 text-xs">
                          <PenTool className="h-3 w-3" />
                          {writingStyle} style
                        </Badge>
                        {subjectMatters.map((subject) => (
                          <Badge key={subject} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
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
