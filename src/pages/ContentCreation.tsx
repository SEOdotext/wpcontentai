
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ContentStructureView from '@/components/ContentStructureView';

const ContentCreation = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto py-8 space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Content Creation</h1>
              </div>
              <ContentStructureView className="min-h-[600px]" />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ContentCreation;
