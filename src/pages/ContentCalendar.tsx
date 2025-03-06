
import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Calendar as CalendarIcon, ChevronDown, List, Tag } from 'lucide-react';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import ContentCard, { Keyword } from '@/components/ContentCard';
import KeywordGenerator from '@/components/KeywordGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/EmptyState';
import { Calendar } from '@/components/ui/calendar';
import { format, getMonth, getYear, parseISO } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Mock data with dates added for calendar view
const recentContent = [
  {
    title: 'How to Optimize Your WordPress Site for Speed',
    description: 'Learn the best practices for improving your WordPress site loading times.',
    dateCreated: 'Oct 15, 2023',
    date: new Date(2023, 9, 15), // October 15, 2023
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
    date: new Date(2023, 9, 10), // October 10, 2023
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
    date: new Date(2023, 10, 5), // November 5, 2023
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
    date: new Date(2023, 10, 12), // November 12, 2023
    status: 'scheduled',
    keywords: [
      { text: 'wordpress', difficulty: 'easy' },
      { text: 'plugins', difficulty: 'medium' },
      { text: 'business', difficulty: 'medium' },
    ],
    isFavorite: true,
  },
  // Adding more content across different months for testing accordion view
  {
    title: 'WordPress Theme Development: A Complete Guide',
    description: 'Learn how to create custom WordPress themes from scratch.',
    dateCreated: 'Dec 3, 2023',
    date: new Date(2023, 11, 3), // December 3, 2023
    status: 'draft',
    keywords: [
      { text: 'wordpress', difficulty: 'hard' },
      { text: 'development', difficulty: 'hard' },
      { text: 'themes', difficulty: 'medium' },
    ],
    isFavorite: false,
  },
  {
    title: 'SEO Trends to Watch in 2024',
    description: 'Stay ahead of the competition with these upcoming SEO trends.',
    dateCreated: 'Jan 10, 2024',
    date: new Date(2024, 0, 10), // January 10, 2024
    status: 'scheduled',
    keywords: [
      { text: 'seo', difficulty: 'medium' },
      { text: 'trends', difficulty: 'easy' },
    ],
    isFavorite: true,
  },
];

// Combine all content for calendar view
const allContent = [...recentContent, ...upcomingContent];

// Create mapping of dates to content for calendar view
const getContentByDate = () => {
  const contentMap = new Map();
  
  allContent.forEach(content => {
    const dateStr = content.date.toDateString();
    if (!contentMap.has(dateStr)) {
      contentMap.set(dateStr, []);
    }
    contentMap.get(dateStr).push(content);
  });
  
  return contentMap;
};

// Group content by month and year
const getContentByMonthYear = () => {
  const monthYearMap: Record<string, typeof allContent> = {};
  
  allContent.forEach(content => {
    const date = content.date;
    const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
    const monthYearLabel = format(date, 'MMMM yyyy');
    
    if (!monthYearMap[monthYear]) {
      monthYearMap[monthYear] = [];
    }
    
    monthYearMap[monthYear].push(content);
  });
  
  // Sort the content within each month by date
  Object.keys(monthYearMap).forEach(key => {
    monthYearMap[key].sort((a, b) => a.date.getTime() - b.date.getTime());
  });
  
  return monthYearMap;
};

// Get sorted array of unique month-year combinations
const getSortedMonthYears = () => {
  const monthYearMap = getContentByMonthYear();
  return Object.keys(monthYearMap)
    .sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      return yearB - yearA || monthB - monthA; // Sort descending (newest first)
    })
    .map(key => {
      const [year, month] = key.split('-').map(Number);
      const date = new Date(year, month, 1);
      return {
        key,
        label: format(date, 'MMMM yyyy'),
        content: monthYearMap[key]
      };
    });
};

const ContentCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeView, setActiveView] = useState<'monthly' | 'list'>('monthly');
  const contentByDate = getContentByDate();
  const sortedMonthYears = getSortedMonthYears();

  // Function to get content for a specific date
  const getContentForDate = (date: Date | undefined) => {
    if (!date) return [];
    return contentByDate.get(date.toDateString()) || [];
  };

  // Get selected date content
  const selectedDateContent = getContentForDate(date);

  // Create date class names to highlight dates with content
  const getDayClassName = (date: Date) => {
    return contentByDate.has(date.toDateString()) 
      ? "bg-primary/20 text-primary-foreground font-medium rounded-full" 
      : "";
  };

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
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-medium">Content Overview</CardTitle>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setActiveView('monthly')}
                          className={`p-2 rounded-md ${activeView === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
                        >
                          <CalendarIcon className="h-4 w-4" />
                          <span className="sr-only">Monthly View</span>
                        </button>
                        <button 
                          onClick={() => setActiveView('list')}
                          className={`p-2 rounded-md ${activeView === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
                        >
                          <List className="h-4 w-4" />
                          <span className="sr-only">List View</span>
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {activeView === 'monthly' ? (
                      <div className="space-y-6">
                        <Accordion type="single" collapsible className="w-full">
                          {sortedMonthYears.map((monthYear) => (
                            <AccordionItem key={monthYear.key} value={monthYear.key}>
                              <AccordionTrigger className="text-md font-medium hover:no-underline">
                                {monthYear.label} ({monthYear.content.length} items)
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pt-2 space-y-4">
                                  {monthYear.content.map((content, index) => (
                                    <ContentCard
                                      key={`${monthYear.key}-${index}`}
                                      title={content.title}
                                      description={content.description}
                                      keywords={content.keywords as Keyword[]}
                                      dateCreated={format(content.date, 'MMM d, yyyy')}
                                      status={content.status as 'draft' | 'published' | 'scheduled'}
                                      isFavorite={content.isFavorite}
                                      className="border border-border/50"
                                    />
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    ) : (
                      <Tabs defaultValue="recent" className="w-full">
                        <TabsList className="mb-6 w-full justify-start">
                          <TabsTrigger value="recent" className="flex items-center gap-2">
                            <List className="h-4 w-4" />
                            <span>Recent Content</span>
                          </TabsTrigger>
                          <TabsTrigger value="upcoming" className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
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
                    )}
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
