
import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CalendarClock, List, Tag } from 'lucide-react';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import ContentCard, { Keyword } from '@/components/ContentCard';
import KeywordGenerator from '@/components/KeywordGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex flex-col gap-4">
                <h1 className="text-2xl font-bold">Content Calendar</h1>
                
                <Card className="border-0 shadow-elevation">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Content Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="recent" className="w-full">
                      <TabsList className="mb-6 w-full justify-start">
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
                        <div className="grid gap-6">
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
                        <div className="grid gap-6">
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
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-elevation">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Keyword Generator
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
