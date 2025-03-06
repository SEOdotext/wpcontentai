import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, List, Minus } from 'lucide-react';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import ContentCard, { Keyword } from '@/components/ContentCard';
import ContentView from '@/components/ContentView';
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
import { format, addMonths, subMonths, getDate, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface CalendarContent {
  id: number;
  title: string;
  description: string;
  dateCreated: string;
  date: string;
  status: 'published' | 'draft' | 'scheduled';
  keywords: Keyword[];
}

const ContentCalendar = () => {
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const [activeView, setActiveView] = useState<'monthly' | 'list'>('monthly');
  const [selectedContent, setSelectedContent] = useState<CalendarContent | null>(null);
  const [allContent, setAllContent] = useState<CalendarContent[]>([]);
  const [recentContent, setRecentContent] = useState<CalendarContent[]>([]);
  const [upcomingContent, setUpcomingContent] = useState<CalendarContent[]>([]);
  
  useEffect(() => {
    try {
      const storedContent = localStorage.getItem('calendarContent');
      if (storedContent) {
        const parsedContent = JSON.parse(storedContent) as CalendarContent[];
        console.log("Loaded calendar content:", parsedContent);
        
        const processedContent = parsedContent.map(item => ({
          ...item,
          date: new Date(item.date).toISOString(),
          dateCreated: item.dateCreated || new Date().toISOString()
        }));
        
        setAllContent(processedContent);
        
        const now = new Date();
        const recent = processedContent.filter(
          item => new Date(item.date) <= now
        );
        const upcoming = processedContent.filter(
          item => new Date(item.date) > now
        );
        
        setRecentContent(recent);
        setUpcomingContent(upcoming);
      }
    } catch (error) {
      console.error("Error loading calendar content:", error);
    }
  }, []);
  
  const previousMonth = subMonths(displayDate, 1);
  const nextMonth = addMonths(displayDate, 1);
  
  const formatTabValue = (date: Date) => format(date, 'yyyy-MM');
  
  const handleTabChange = (value: string) => {
    const [yearStr, monthStr] = value.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    
    const day = displayDate.getDate();
    setDisplayDate(new Date(year, month, day));
  };
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setDisplayDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const handleContentClick = (content: CalendarContent) => {
    setSelectedContent(content);
  };

  const handleDeleteContent = (contentId: number) => {
    const updatedContent = allContent.filter(content => content.id !== contentId);
    
    localStorage.setItem('calendarContent', JSON.stringify(updatedContent));
    
    setAllContent(updatedContent);
    
    const now = new Date();
    const recent = updatedContent.filter(
      item => new Date(item.date) <= now
    );
    const upcoming = updatedContent.filter(
      item => new Date(item.date) > now
    );
    
    setRecentContent(recent);
    setUpcomingContent(upcoming);
    
    if (selectedContent && selectedContent.id === contentId) {
      setSelectedContent(null);
    }
    
    toast.success("Content removed from calendar");
  };
  
  const getContentByMonth = (date: Date) => {
    const month = date.getMonth();
    const year = date.getFullYear();
    
    return allContent.filter(content => {
      const contentDate = new Date(content.date);
      const contentMonth = contentDate.getMonth();
      const contentYear = contentDate.getFullYear();
      return contentMonth === month && contentYear === year;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  
  const renderTableRow = (content: CalendarContent, period: string, index: number) => {
    return (
      <TableRow key={`${period}-${index}`} className="cursor-pointer hover:bg-accent/30" onClick={() => handleContentClick(content)}>
        <TableCell className="font-medium">
          {format(new Date(content.date), 'd MMM')}
        </TableCell>
        <TableCell>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value={`${period}-${index}`} className="border-0">
              <AccordionTrigger className="py-0 hover:no-underline" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm font-medium">{content.title}</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="py-2">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-muted-foreground">{content.description}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteContent(content.id);
                      }}
                      title="Remove from calendar"
                    >
                      <Minus className="h-3.5 w-3.5" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
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
    );
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
                          {format(displayDate, 'MMMM yyyy')}
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
                        value={formatTabValue(displayDate)}
                        onValueChange={handleTabChange}
                        className="w-full"
                      >
                        <TabsList className="grid grid-cols-3 mb-6">
                          <TabsTrigger value={formatTabValue(previousMonth)}>
                            {format(previousMonth, 'MMM yyyy')}
                          </TabsTrigger>
                          <TabsTrigger value={formatTabValue(displayDate)}>
                            {format(displayDate, 'MMM yyyy')}
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
                                  getContentByMonth(previousMonth).map((content, index) => 
                                    renderTableRow(content, 'prev', index)
                                  )
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
                        
                        <TabsContent value={formatTabValue(displayDate)}>
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
                                {getContentByMonth(displayDate).length > 0 ? (
                                  getContentByMonth(displayDate).map((content, index) => 
                                    renderTableRow(content, 'current', index)
                                  )
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
                                  getContentByMonth(nextMonth).map((content, index) => 
                                    renderTableRow(content, 'next', index)
                                  )
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
                            {recentContent.length > 0 ? (
                              recentContent.map((content, index) => (
                                <ContentCard
                                  key={index}
                                  title={content.title}
                                  description={content.description}
                                  keywords={content.keywords as Keyword[]}
                                  dateCreated={content.dateCreated}
                                  status={content.status as 'draft' | 'published' | 'scheduled'}
                                  isFavorite={content.isFavorite}
                                  onClick={() => handleContentClick(content)}
                                  onFavoriteToggle={() => handleToggleFavorite(content.id)}
                                  onEditClick={() => console.log(`Edit content ${content.id}`)}
                                  onDuplicateClick={() => console.log(`Duplicate content ${content.id}`)}
                                  onDeleteClick={() => handleDeleteContent(content.id)}
                                />
                              ))
                            ) : (
                              <div className="text-center py-12 text-muted-foreground">
                                No recent content available
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="upcoming">
                          <div className="grid gap-6">
                            {upcomingContent.length > 0 ? (
                              upcomingContent.map((content, index) => (
                                <ContentCard
                                  key={index}
                                  title={content.title}
                                  description={content.description}
                                  keywords={content.keywords as Keyword[]}
                                  dateCreated={content.dateCreated}
                                  status={content.status as 'draft' | 'published' | 'scheduled'}
                                  isFavorite={content.isFavorite}
                                  onClick={() => handleContentClick(content)}
                                  onFavoriteToggle={() => handleToggleFavorite(content.id)}
                                  onEditClick={() => console.log(`Edit content ${content.id}`)}
                                  onDuplicateClick={() => console.log(`Duplicate content ${content.id}`)}
                                  onDeleteClick={() => handleDeleteContent(content.id)}
                                />
                              ))
                            ) : (
                              <div className="text-center py-12 text-muted-foreground">
                                No upcoming content scheduled
                              </div>
                            )}
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
      
      {selectedContent && (
        <ContentView
          title={selectedContent.title}
          description={selectedContent.description}
          keywords={selectedContent.keywords}
          dateCreated={selectedContent.dateCreated}
          status={selectedContent.status}
          onClose={() => setSelectedContent(null)}
          onDeleteClick={() => handleDeleteContent(selectedContent.id)}
        />
      )}
    </SidebarProvider>
  );
};

export default ContentCalendar;
