import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import ContentCard, { Keyword } from '@/components/ContentCard';
import ContentView from '@/components/ContentView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from '@/components/ui/separator';
import { format, addMonths, subMonths } from 'date-fns';
import { toast } from 'sonner';

interface CalendarContent {
  id: number;
  title: string;
  description: string;
  dateCreated: string;
  date: string;
  contentStatus: 'published' | 'draft' | 'scheduled';
  keywords: Keyword[];
  // For backward compatibility with older data
  status?: 'published' | 'draft' | 'scheduled';
}

const ContentCalendar = () => {
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const [selectedContent, setSelectedContent] = useState<CalendarContent | null>(null);
  const [allContent, setAllContent] = useState<CalendarContent[]>([]);
  
  useEffect(() => {
    try {
      const storedContent = localStorage.getItem('calendarContent');
      if (storedContent) {
        const parsedContent = JSON.parse(storedContent) as CalendarContent[];
        console.log("Loaded calendar content:", parsedContent);
        
        const processedContent = parsedContent.map(item => ({
          ...item,
          date: new Date(item.date).toISOString(),
          dateCreated: item.dateCreated || new Date().toISOString(),
          // Convert status to contentStatus if the old format exists
          contentStatus: item.contentStatus || (item.status as CalendarContent['contentStatus'] | undefined)
        }));
        
        setAllContent(processedContent);
      }
    } catch (error) {
      console.error("Error loading calendar content:", error);
    }
  }, []);
  
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

  // Add these handlers for the new features
  const handleEditContent = (contentId: number) => {
    // Placeholder for edit functionality
    toast.info("Edit functionality will be implemented soon");
  };

  const handleRegenerateContent = (contentId: number) => {
    // Placeholder for AI regeneration functionality
    toast.info("AI regeneration will be implemented soon");
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
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                            getContentByMonth(displayDate).map((content, index) => (
                              <TableRow 
                                key={index} 
                                className="cursor-pointer hover:bg-accent/30" 
                                onClick={() => handleContentClick(content)}
                              >
                                <TableCell className="font-medium">
                                  {format(new Date(content.date), 'd MMM')}
                                </TableCell>
                                <TableCell>{content.title}</TableCell>
                                <TableCell>
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
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
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
          status={selectedContent.contentStatus}
          onClose={() => setSelectedContent(null)}
          onDeleteClick={() => handleDeleteContent(selectedContent.id)}
          onEditClick={() => handleEditContent(selectedContent.id)}
          onRegenerateClick={() => handleRegenerateContent(selectedContent.id)}
        />
      )}
    </SidebarProvider>
  );
};

export default ContentCalendar;
