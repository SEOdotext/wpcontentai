import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import ContentStructureView from '@/components/ContentStructureView';
import { Card, CardContent } from '@/components/ui/card';
import ContentCard, { Keyword } from '@/components/ContentCard';

// Simplified mock data
const recentContent = [
  {
    title: 'How to Optimize Your WordPress Site for Speed',
    description: 'Learn the best practices for improving your WordPress site loading times.',
    dateCreated: 'Oct 15, 2023',
    status: 'published',
    keywords: [
      { text: 'wordpress', difficulty: 'medium' },
      { text: 'speed', difficulty: 'easy' },
    ],
  },
  {
    title: 'The Ultimate Guide to On-Page SEO',
    description: 'Discover everything you need to know about optimizing your content for search engines.',
    dateCreated: 'Oct 10, 2023',
    status: 'draft',
    keywords: [
      { text: 'seo', difficulty: 'hard' },
      { text: 'content', difficulty: 'easy' },
    ],
  },
];

const Index = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <h1 className="text-2xl font-semibold">Content Structure</h1>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-medium mb-4">Recent Content</h2>
                  <div className="grid gap-4">
                    {recentContent.map((content, index) => (
                      <ContentCard
                        key={index}
                        title={content.title}
                        description={content.description}
                        keywords={content.keywords as Keyword[]}
                        dateCreated={content.dateCreated}
                        status={content.status as 'draft' | 'published' | 'scheduled'}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <h2 className="text-lg font-medium mb-4">Title Generator</h2>
                  <Card>
                    <CardContent className="p-4">
                      <ContentStructureView />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
