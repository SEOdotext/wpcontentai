import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, List } from 'lucide-react';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import ContentCard, { Keyword } from '@/components/ContentCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from '@/components/ui/separator';
import { format, addMonths, subMonths, isEqual, startOfMonth, getDate } from 'date-fns';

const recentContent = [
  {
    title: 'How to Optimize Your WordPress Site for Speed',
    description: 'Learn the best practices for improving your WordPress site loading times.',
    dateCreated: 'Oct 15, 2023',
    date: new Date(2023, 9, 15),
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
    date: new Date(2023, 9, 10),
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
    date: new Date(2023, 10, 5),
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
    date: new Date(2023, 10, 12),
    status: 'scheduled',
    keywords: [
      { text: 'wordpress', difficulty: 'easy' },
      { text: 'plugins', difficulty: 'medium' },
      { text: 'business', difficulty: 'medium' },
    ],
    isFavorite: true,
  },
  {
    title: 'WordPress Theme Development: A Complete Guide',
    description: 'Learn how to create custom WordPress themes from scratch.',
    dateCreated: 'Dec 3, 2023',
    date: new Date(2023, 11, 3),
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
    date: new Date(2024, 0, 10),
    status: 'scheduled',
    keywords: [
      { text: 'seo', difficulty: 'medium' },
      { text: 'trends', difficulty: 'easy' },
    ],
    isFavorite: true,
  },
];

const allContent = [...recentContent, ...upcomingContent];

const getContentByMonth = (date: Date) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  return allContent.filter(content => {
    const contentMonth = content.date.getMonth();
    const contentYear = content.date.getFullYear();
    return contentMonth === month && contentYear === year;
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
};

const ContentCalendar = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeView, setActiveView] = useState<'monthly' | 'list'>('monthly');
  
  const previousMonth = subMonths(currentDate, 1);
  const nextMonth = addMonths(currentDate, 1);
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };
  
  const formatTabValue = (date: Date) => format(date, 'yyyy-MM');
  
  useEffect(() => {
    // No need to do anything else, just having currentDate in the dependency array
    // will ensure that the previousMonth and nextMonth are recalculated whenever currentDate changes
  }, [currentDate]);
  
  const handleTabChange = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    setCurrentDate(new Date(year, month));
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
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => navigateMonth('prev')}
                          title="Previous month"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">
                          {format(currentDate, 'MMMM yyyy')}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigateMonth('next')}
                          title="Next month"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6 mx-2" />
                        <Button 
                          onClick={() => setActiveView('monthly')}
                          variant={activeView === 'monthly' ? 'default' : 'ghost'}
                          size="sm"
                          className="px-2"
                        >
                          <CalendarIcon className="h-4 w-4" />
                          <span className="sr-only md:not-sr-only md:ml-2">Monthly</span>
                        </Button>
                        <Button 
                          onClick={() => setActiveView('list')}
                          variant={activeView === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          className="px-2"
                        >
                          <List className="h-4 w-4" />
                          <span className="sr-only md:not-sr-only md:ml-2">List</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {activeView === 'monthly' ? (
                      <Tabs 
                        defaultValue={formatTabValue(currentDate)} 
                        value={formatTabValue(currentDate)}
                        onValueChange={handleTabChange}
                        className="w-full"
                      >
                        <TabsList className="grid grid-cols-3 mb-6">
                          <TabsTrigger value={formatTabValue(previousMonth)}>
                            {format(previousMonth, 'MMM yyyy')}
                          </TabsTrigger>
                          <TabsTrigger value={formatTabValue(currentDate)}>
                            {format(currentDate, 'MMM yyyy')}
                          </TabsTrigger>
                          <TabsTrigger value={formatTabValue(nextMonth)}>
                            {format(nextMonth, 'MMM yyyy')}
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value={formatTabValue(previousMonth)}>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[100px]">Date</TableHead>
                                  <TableHead>Title</TableHead>
                                  <TableHead className="w-[120px]">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getContentByMonth(previousMonth).length > 0 ? (
                                  getContentByMonth(previousMonth).map((content, index) => (
                                    <TableRow key={`prev-${index}`}>
                                      <TableCell className="font-medium">
                                        {format(content.date, 'd MMM')}
                                      </TableCell>
                                      <TableCell>
                                        <Accordion type="single" collapsible className="w-full">
                                          <AccordionItem value={`prev-${index}`} className="border-0">
                                            <AccordionTrigger className="py-0 hover:no-underline">
                                              <span className="text-sm font-medium">{content.title}</span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                              <div className="py-2">
                                                <p className="text-sm text-muted-foreground mb-3">{content.description}</p>
                                                {content.keywords.length > 0 && (
                                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {content.keywords.map((keyword, keywordIndex) => (
                                                      <span key={keywordIndex} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                        {keyword.text}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                      </TableCell>
                                      <TableCell>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                          content.status === 'published' 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            : content.status === 'scheduled'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                        }`}>
                                          {content.status}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                      No content scheduled for this month
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value={formatTabValue(currentDate)}>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[100px]">Date</TableHead>
                                  <TableHead>Title</TableHead>
                                  <TableHead className="w-[120px]">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getContentByMonth(currentDate).length > 0 ? (
                                  getContentByMonth(currentDate).map((content, index) => (
                                    <TableRow key={`current-${index}`}>
                                      <TableCell className="font-medium">
                                        {format(content.date, 'd MMM')}
                                      </TableCell>
                                      <TableCell>
                                        <Accordion type="single" collapsible className="w-full">
                                          <AccordionItem value={`current-${index}`} className="border-0">
                                            <AccordionTrigger className="py-0 hover:no-underline">
                                              <span className="text-sm font-medium">{content.title}</span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                              <div className="py-2">
                                                <p className="text-sm text-muted-foreground mb-3">{content.description}</p>
                                                {content.keywords.length > 0 && (
                                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {content.keywords.map((keyword, keywordIndex) => (
                                                      <span key={keywordIndex} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                        {keyword.text}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                      </TableCell>
                                      <TableCell>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                          content.status === 'published' 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            : content.status === 'scheduled'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                        }`}>
                                          {content.status}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                      No content scheduled for this month
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value={formatTabValue(nextMonth)}>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[100px]">Date</TableHead>
                                  <TableHead>Title</TableHead>
                                  <TableHead className="w-[120px]">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getContentByMonth(nextMonth).length > 0 ? (
                                  getContentByMonth(nextMonth).map((content, index) => (
                                    <TableRow key={`next-${index}`}>
                                      <TableCell className="font-medium">
                                        {format(content.date, 'd MMM')}
                                      </TableCell>
                                      <TableCell>
                                        <Accordion type="single" collapsible className="w-full">
                                          <AccordionItem value={`next-${index}`} className="border-0">
                                            <AccordionTrigger className="py-0 hover:no-underline">
                                              <span className="text-sm font-medium">{content.title}</span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                              <div className="py-2">
                                                <p className="text-sm text-muted-foreground mb-3">{content.description}</p>
                                                {content.keywords.length > 0 && (
                                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {content.keywords.map((keyword, keywordIndex) => (
                                                      <span key={keywordIndex} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                        {keyword.text}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                      </TableCell>
                                      <TableCell>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                          content.status === 'published' 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            : content.status === 'scheduled'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                        }`}>
                                          {content.status}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                      No content scheduled for this month
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                      </Tabs>
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
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ContentCalendar;
