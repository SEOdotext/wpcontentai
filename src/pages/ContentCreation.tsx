
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ContentStructureView from '@/components/ContentStructureView';
import { Toaster } from "@/components/ui/sonner";
import { useWebsites } from '@/context/WebsitesContext';
import { useSettings } from '@/context/SettingsContext';
import { Skeleton } from "@/components/ui/skeleton";

const ContentCreation = () => {
  const { currentWebsite } = useWebsites();
  const { writingStyle, subjectMatters, isLoading } = useSettings();

  // Adding a console log to help with debugging
  console.log('ContentCreation rendering, currentWebsite:', currentWebsite?.name);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">
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
