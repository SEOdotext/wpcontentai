
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ContentStructureView from '@/components/ContentStructureView';
import { Toaster } from "@/components/ui/sonner";

const ContentCreation = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-4">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Content Creation</h1>
              </div>
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
