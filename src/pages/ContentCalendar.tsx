import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, FileEdit, Send } from 'lucide-react';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
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
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useWebsites } from '@/context/WebsitesContext';
import { useWordPress } from '@/context/WordPressContext';
import { supabase } from '@/integrations/supabase/client';

interface CalendarContent {
  id: number;
  title: string;
  description: string;
  dateCreated: string;
  date: string;
  contentStatus?: 'published' | 'draft' | 'scheduled';
  keywords: any[];
  // For backward compatibility with older data
  status?: 'published' | 'draft' | 'scheduled';
  // Add new field for WordPress sent date
  wpSentDate?: string;
}

const ContentCalendar = () => {
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const [selectedContent, setSelectedContent] = useState<CalendarContent | null>(null);
  const [allContent, setAllContent] = useState<CalendarContent[]>([]);
  const [isGeneratingContent, setIsGeneratingContent] = useState<boolean>(false);
  const [generatingContentId, setGeneratingContentId] = useState<number | null>(null);
  const [isSendingToWP, setIsSendingToWP] = useState<boolean>(false);
  const [sendingToWPId, setSendingToWPId] = useState<number | null>(null);
  const { currentWebsite } = useWebsites();
  const { createPost, settings: wpSettings } = useWordPress();
  
  useEffect(() => {
    try {
      const storedContent = localStorage.getItem('calendarContent');
      if (storedContent) {
        const parsedContent = JSON.parse(storedContent) as CalendarContent[];
        console.log("Loaded calendar content:", parsedContent);
        
        const processedContent = parsedContent.map(item => ({
          ...item,
          date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
          dateCreated: item.dateCreated || new Date().toISOString(),
          // Convert status to contentStatus if the old format exists
          contentStatus: item.contentStatus || item.status || 'scheduled'
        }));
        
        // Sort by date
        processedContent.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
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

  const handleEditContent = (contentId: number) => {
    toast.info("Edit functionality will be implemented soon");
  };

  const handleRegenerateContent = (contentId: number) => {
    toast.info("AI regeneration will be implemented soon");
  };

  const handleGenerateContent = async (contentId: number) => {
    const content = allContent.find(item => item.id === contentId);
    if (!content) {
      toast.error("Content not found");
      return;
    }

    if (!currentWebsite) {
      toast.error("Please select a website first");
      return;
    }

    try {
      setGeneratingContentId(contentId);
      setIsGeneratingContent(true);
      
      // Dynamically import the services to generate content
      const { generatePostContent, fetchWebsiteContent } = await import('@/services/aiService');
      
      // Fetch website content
      console.log(`Starting content fetch for website: ${currentWebsite.url} (ID: ${currentWebsite.id})`);
      const websiteContent = await fetchWebsiteContent(currentWebsite.url, currentWebsite.id);
      console.log(`Completed content fetch, received ${websiteContent.length} characters`);
      
      // Convert the keywords array to string array
      const keywordsArray = content.keywords && Array.isArray(content.keywords) 
        ? content.keywords.map(k => typeof k === 'string' ? k : k.text) 
        : ['wordpress', 'content'];
      
      // Get writing style from localStorage or use default
      const writingStyle = localStorage.getItem('writingStyle') || 
        'SEO friendly content that captures the reader. Use simple, clear language with a genuine tone.';
      
      // Get WordPress template from localStorage or use default
      const wpTemplate = localStorage.getItem('wordpressTemplate') || '';
      
      // Generate post content with websiteId for fetching internal links
      const generatedContent = await generatePostContent(
        content.title,
        keywordsArray,
        writingStyle,
        websiteContent,
        currentWebsite.id, // Pass the website ID
        wpTemplate
      );
      
      // Update the content with the generated post
      const updatedContent = allContent.map(item => 
        item.id === contentId 
          ? { ...item, description: generatedContent } 
          : item
      );
      
      // Save to localStorage
      localStorage.setItem('calendarContent', JSON.stringify(updatedContent));
      setAllContent(updatedContent);
      
      // Show the updated content to the user
      const updatedContentItem = updatedContent.find(item => item.id === contentId);
      if (updatedContentItem) {
        setSelectedContent(updatedContentItem);
      }
      
      toast.success("Content generated successfully");
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Failed to generate content");
    } finally {
      setIsGeneratingContent(false);
      setGeneratingContentId(null);
    }
  };

  const handleDateChange = (contentId: number, newDate: Date | undefined) => {
    if (!newDate) return;
    
    const updatedContent = allContent.map(content => 
      content.id === contentId 
        ? { ...content, date: newDate.toISOString() } 
        : content
    );
    
    setAllContent(updatedContent);
    localStorage.setItem('calendarContent', JSON.stringify(updatedContent));
    
    toast.success("Publication date updated", {
      description: `Content scheduled for ${format(newDate, 'MMM dd, yyyy')}`
    });
  };

  const handleSendToWordPress = async (contentId: number) => {
    console.log('=== WordPress Send Post Debug ===');
    console.log('handleSendToWordPress called with contentId:', contentId);
    
    const content = allContent.find(item => item.id === contentId);
    if (!content) {
      console.error('Content not found for ID:', contentId);
      toast.error("Content not found");
      return;
    }
    console.log('Found content:', { 
      title: content.title, 
      hasDescription: !!content.description,
      contentLength: content.description?.length || 0,
      date: content.date
    });

    if (!currentWebsite) {
      console.error('No website selected');
      toast.error("Please select a website first");
      return;
    }
    console.log('Current website:', { 
      id: currentWebsite.id, 
      name: currentWebsite.name, 
      url: currentWebsite.url 
    });
    
    if (!wpSettings) {
      console.error('WordPress settings not loaded');
      toast.error("WordPress is not configured. Please set up WordPress connection in Settings.");
      return;
    }
    
    if (!wpSettings.is_connected) {
      console.error('WordPress not connected:', {
        wpUrl: wpSettings.wp_url?.substring(0, 30) + '...',
        isConnected: wpSettings.is_connected,
        username: wpSettings.wp_username
      });
      toast.error("WordPress is not connected. Please set up WordPress connection in Settings.");
      return;
    }
    
    console.log('WordPress settings:', { 
      id: wpSettings.id, 
      websiteId: wpSettings.website_id, 
      isConnected: wpSettings.is_connected,
      wpUrl: wpSettings.wp_url?.substring(0, 30) + '...',
      hasPassword: !!wpSettings.wp_application_password
    });

    try {
      setSendingToWPId(contentId);
      setIsSendingToWP(true);
      
      // Extract title and HTML content
      const title = content.title;
      const htmlContent = content.description || '';
      
      if (!htmlContent || htmlContent.trim().length === 0) {
        console.error('No HTML content to send');
        toast.error("No content to send. Please generate content first.");
        setIsSendingToWP(false);
        setSendingToWPId(null);
        return;
      }
      
      console.log('Preparing to send to WordPress:', { 
        title, 
        contentLength: htmlContent.length,
        contentPreview: htmlContent.substring(0, 100) + '...' 
      });
      
      console.log('Checking auth session before sending to WordPress');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error('Auth session error:', sessionError);
        toast.error('You must be logged in to publish to WordPress');
        setIsSendingToWP(false);
        setSendingToWPId(null);
        return;
      }
      console.log('Auth session valid:', !!sessionData.session);
      
      // Send to WordPress as a draft post initially
      console.log('Calling createPost from WordPressContext');
      const success = await createPost(title, htmlContent, 'draft');
      console.log('createPost result:', success);
      
      if (success) {
        console.log('WordPress post created successfully, updating local state');
        // Update the content status to indicate it's been sent to WordPress
        const updatedContent = allContent.map(item => 
          item.id === contentId 
            ? { 
                ...item, 
                contentStatus: 'published' as const,
                wpSentDate: new Date().toISOString() 
              } 
            : item
        );
        
        // Save to localStorage
        localStorage.setItem('calendarContent', JSON.stringify(updatedContent));
        setAllContent(updatedContent);
        
        // Show the updated content to the user
        const updatedContentItem = updatedContent.find(item => item.id === contentId);
        if (updatedContentItem) {
          setSelectedContent(updatedContentItem);
        }
        
        toast.success("Content sent to WordPress successfully");
      } else {
        console.error('Failed to create WordPress post');
        toast.error("Failed to send content to WordPress");
      }
    } catch (error) {
      console.error("Error sending to WordPress:", error);
      toast.error(`Failed to send content to WordPress: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      console.log('=== End WordPress Send Post Debug ===');
      setIsSendingToWP(false);
      setSendingToWPId(null);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-4 overflow-y-auto">
            <div className="w-full space-y-4">
              <div className="flex flex-col gap-4">
                <Card className="border-0 shadow-elevation">
                  <CardHeader className="pb-2 pt-4">
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
                            <TableHead className="w-[150px]">Date</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead className="w-[120px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getContentByMonth(displayDate).length > 0 ? (
                            getContentByMonth(displayDate).map((content, index) => (
                              <TableRow 
                                key={index} 
                                className="cursor-pointer hover:bg-accent/30"
                              >
                                <TableCell className="font-medium">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="flex items-center text-xs p-0 h-auto font-medium hover:bg-transparent hover:text-primary"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <CalendarIcon className="h-3 w-3 mr-1" />
                                        <span>{format(parseISO(content.date), 'd MMM yyyy')}</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={parseISO(content.date)}
                                        onSelect={(date) => handleDateChange(content.id, date)}
                                        initialFocus
                                        className={cn("p-3 pointer-events-auto")}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </TableCell>
                                <TableCell onClick={() => handleContentClick(content)}>{content.title}</TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-primary hover:bg-primary/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleGenerateContent(content.id);
                                      }}
                                      title="Generate content with AI"
                                      disabled={isGeneratingContent}
                                    >
                                      {isGeneratingContent && generatingContentId === content.id ? (
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                      ) : (
                                        <FileEdit className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-emerald-600 hover:bg-emerald-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendToWordPress(content.id);
                                      }}
                                      title="Send to WordPress"
                                      disabled={isSendingToWP || !wpSettings?.is_connected}
                                    >
                                      {isSendingToWP && sendingToWPId === content.id ? (
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                                      ) : (
                                        <Send className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
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
                                  </div>
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
          status={selectedContent.contentStatus || 'scheduled'}
          onClose={() => setSelectedContent(null)}
          onDeleteClick={() => handleDeleteContent(selectedContent.id)}
          onEditClick={() => handleEditContent(selectedContent.id)}
          onRegenerateClick={() => handleRegenerateContent(selectedContent.id)}
          fullContent={selectedContent.description}
          wpSentDate={selectedContent.wpSentDate}
        />
      )}
    </SidebarProvider>
  );
};

export default ContentCalendar;
