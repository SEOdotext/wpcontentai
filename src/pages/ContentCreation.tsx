
import React, { useEffect, useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ContentStructureView from '@/components/ContentStructureView';
import { Toaster } from "@/components/ui/sonner";
import { useWebsites } from '@/context/WebsitesContext';
import { useSettings } from '@/context/SettingsContext';
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const ContentCreation = () => {
  const { currentWebsite, isLoading: websitesLoading } = useWebsites();
  const { writingStyle, subjectMatters, isLoading: settingsLoading } = useSettings();
  const [hasError, setHasError] = useState<boolean>(false);
  const [missingOrganisation, setMissingOrganisation] = useState<boolean>(false);

  // Adding a console log to help with debugging
  console.log('ContentCreation rendering, currentWebsite:', currentWebsite?.name);
  
  useEffect(() => {
    // Check for errors in the context data
    const checkErrors = () => {
      if (!websitesLoading && !settingsLoading) {
        // Check if we're missing required data
        if (!currentWebsite || !writingStyle || !subjectMatters) {
          setHasError(true);
          console.log('Content creation detected missing data:', { 
            hasWebsite: !!currentWebsite, 
            hasStyle: !!writingStyle, 
            hasSubjects: !!(subjectMatters && subjectMatters.length) 
          });
        } else {
          setHasError(false);
        }

        // Check specifically for missing organisation
        if (currentWebsite && !currentWebsite.organisation_id) {
          console.log('Website missing organisation_id:', currentWebsite);
          setMissingOrganisation(true);
          // Only show toast once when detected
          toast.info("No organisation associated with this website. Some features may be limited.", {
            id: "missing-organisation-warning",
            duration: 5000,
          });
        } else {
          setMissingOrganisation(false);
        }
      }
    };
    
    checkErrors();
  }, [currentWebsite, writingStyle, subjectMatters, websitesLoading, settingsLoading]);

  const isLoading = websitesLoading || settingsLoading;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">
              {isLoading ? (
                <Card>
                  <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[500px] w-full" />
                  </CardContent>
                </Card>
              ) : hasError ? (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Data</AlertTitle>
                  <AlertDescription>
                    There was an issue loading your content settings. Using fallback data instead.
                    If this persists, please try selecting a different website or refreshing the page.
                  </AlertDescription>
                </Alert>
              ) : missingOrganisation ? (
                <Alert variant="default" className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertTitle>No Organisation Associated</AlertTitle>
                  <AlertDescription>
                    This website doesn't have an organisation associated with it. 
                    You can still create content, but some features may be limited.
                  </AlertDescription>
                </Alert>
              ) : null}
              
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
