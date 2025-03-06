
import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CalendarClock, Calendar as CalendarIcon, List, Tag } from 'lucide-react';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import ContentCard, { Keyword } from '@/components/ContentCard';
import KeywordGenerator from '@/components/KeywordGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import EmptyState from '@/components/EmptyState';

// Mock data
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
    isFavorite: true,
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
    isFavorite: false,
  },
];

const upcomingContent = [
  {
    title: 'WordPress Security: Best Practices for 2023',
    description: 'Keep your WordPress site secure with these essential security tips.',
    dateCreated: 'Nov 5, 2023',
    status: 'scheduled',
    keywords: [
      { text: 'wordpress', difficulty: 'medium' },
      { text: 'security', difficulty: 'hard' },
    ],
    isFavorite: false,
  },
  {
    title: '10 WordPress Plugins Every Business Site Needs',
    description: 'Essential plugins to improve functionality and performance.',
    dateCreated: 'Nov 12, 2023',
    status: 'scheduled',
    keywords: [
      { text: 'wordpress', difficulty: 'easy' },
      { text: 'plugins', difficulty: 'medium' },
      { text: 'business', difficulty: 'medium' },
    ],
    isFavorite: true,
  },
];

const ContentCalendar = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <h1 className="text-2xl font-semibold">Content Calendar</h1>
              
              <Tabs defaultValue="recent" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="recent" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span>Recent Content</span>
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    <span>Upcoming Content</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="recent">
                  <div className="grid md:grid-cols-2 gap-4">
                    {recentContent.map((content, index) => (
                      <ContentCard
                        key={index}
                        title={content.title}
                        description={content.description}
                        keywords={content.keywords as Keyword[]}
                        dateCreated={content.dateCreated}
                        status={content.status as 'draft' | 'published' | 'scheduled'}
                        isFavorite={content.isFavorite}
                      />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="upcoming">
                  <div className="grid md:grid-cols-2 gap-4">
                    {upcomingContent.map((content, index) => (
                      <ContentCard
                        key={index}
                        title={content.title}
                        description={content.description}
                        keywords={content.keywords as Keyword[]}
                        dateCreated={content.dateCreated}
                        status={content.status as 'draft' | 'published' | 'scheduled'}
                        isFavorite={content.isFavorite}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="mt-8">
                <h2 className="text-lg font-medium mb-4">Keyword Generator</h2>
                <Card>
                  <CardContent className="p-4">
                    <KeywordGenerator />
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ContentCalendar;
