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
import { useSettings } from '@/context/SettingsContext';
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
  const [directWpSettings, setDirectWpSettings] = useState<any>(null);
  const { writingStyle, wordpressTemplate } = useSettings();
  
  useEffect(() => {
    try {
      // If no website is selected, don't attempt to load calendar content
      if (!currentWebsite) {
        console.log("No website selected, not loading calendar content");
        return;
      }
      
      console.log("=== Calendar Content Loading Debug ===");
      console.log(`Loading calendar content for website: ${currentWebsite.name} (ID: ${currentWebsite.id})`);
      
      // Use website-specific localStorage key
      const storageKey = `calendarContent_${currentWebsite.id}`;
      console.log(`Using storage key: ${storageKey}`);
      
      // Check for data in the new format first
      let storedContent = localStorage.getItem(storageKey);
      
      // Log all localStorage keys to help with debugging
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('calendar')) {
          allKeys.push(key);
        }
      }
      console.log("All calendar-related localStorage keys:", allKeys);
      
      // If no data exists in the new format, check for legacy data
      if (!storedContent) {
        console.log("No website-specific calendar data found, checking for legacy data...");
        const legacyData = localStorage.getItem('calendarContent');
        
        if (legacyData) {
          console.log(`Found legacy calendar data (${legacyData.length} bytes), migrating to website-specific storage...`);
          // Migrate legacy data to the new format
          localStorage.setItem(storageKey, legacyData);
          storedContent = legacyData;
          
          // Optionally, clear the legacy data after migration
          // localStorage.removeItem('calendarContent');
          
          toast.success("Calendar data has been migrated to the new format");
        } else {
          console.log("No legacy calendar data found either");
        }
      } else {
        console.log(`Found website-specific calendar data (${storedContent.length} bytes)`);
      }
      
      if (storedContent) {
        const parsedContent = JSON.parse(storedContent) as CalendarContent[];
        console.log(`Loaded calendar content for website ${currentWebsite.name}: ${parsedContent.length} items`);
        
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
        console.log(`Calendar content processed and sorted. Final count: ${processedContent.length} items`);
      } else {
        // Clear content when switching to a website with no calendar data
        console.log("No calendar content found, clearing any existing content");
        setAllContent([]);
      }
      console.log("=== End Calendar Content Loading Debug ===");
    } catch (error) {
      console.error("Error loading calendar content:", error);
    }
  }, [currentWebsite]);
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setDisplayDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const handleContentClick = (content: CalendarContent) => {
    setSelectedContent(content);
  };

  const handleDeleteContent = (contentId: number) => {
    if (!currentWebsite) return;
    
    const updatedContent = allContent.filter(content => content.id !== contentId);
    const storageKey = `calendarContent_${currentWebsite.id}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedContent));
    setAllContent(updatedContent);
    
    if (selectedContent && selectedContent.id === contentId) {
      setSelectedContent(null);
    }
    
    toast.success("Content removed from calendar");
  };
  
  const getContentByMonth = (date: Date) => {
    // Ensure we have content to filter
    if (!allContent || allContent.length === 0) {
      console.log("No content to filter by month");
      return [];
    }
    
    const month = date.getMonth();
    const year = date.getFullYear();
    
    // Add debug log
    console.log(`Filtering content for ${month+1}/${year}`);
    
    const filteredContent = allContent.filter(content => {
      try {
        const contentDate = new Date(content.date);
        const contentMonth = contentDate.getMonth();
        const contentYear = contentDate.getFullYear();
        return contentMonth === month && contentYear === year;
      } catch (e) {
        console.error("Error parsing date in getContentByMonth:", e, content);
        return false;
      }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log(`Found ${filteredContent.length} items for ${month+1}/${year}`);
    return filteredContent;
  };

  const handleEditContent = (contentId: number) => {
    toast.info("Edit functionality will be implemented soon");
  };

  const handleRegenerateContent = (contentId: number) => {
    handleGenerateContent(contentId);
  };

  const handleGenerateContent = async (contentId: number) => {
    try {
      setIsGeneratingContent(true);
      setGeneratingContentId(contentId);
      
      // Find the selected content
      const content = allContent.find(item => item.id === contentId);
      if (!content) {
        toast.error("Content not found");
        return;
      }
      
      console.log('Generating content for:', content.title);
      
      // Get current website
      if (!currentWebsite) {
        toast.error("Please select a website first");
        return;
      }
      
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
      
      // Use the writing style and WordPress template from the settings context
      console.log('Using writing style from settings:', writingStyle);
      console.log('Using WordPress template from settings:', wordpressTemplate ? 'Template available' : 'No template');
      
      // Generate post content with websiteId for fetching internal links
      const generatedContent = await generatePostContent(
        content.title,
        keywordsArray,
        writingStyle, // Use writingStyle from context
        websiteContent,
        currentWebsite.id, // Pass the website ID
        wordpressTemplate // Use wordpressTemplate from context
      );
      
      // Update the content with the generated post
      const updatedContent = allContent.map(item => 
        item.id === contentId 
          ? { ...item, description: generatedContent } 
          : item
      );
      
      // Save to localStorage
      const storageKey = `calendarContent_${currentWebsite.id}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedContent));
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
    if (!newDate || !currentWebsite) return;
    
    const updatedContent = allContent.map(content => 
      content.id === contentId 
        ? { ...content, date: newDate.toISOString() } 
        : content
    );
    
    setAllContent(updatedContent);
    const storageKey = `calendarContent_${currentWebsite.id}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedContent));
    
    toast.success("Publication date updated", {
      description: `Content scheduled for ${format(newDate, 'MMM dd, yyyy')}`
    });
  };

  const handleSendToWordPress = async (contentId: number) => {
    console.log('=== WordPress Send Post Debug ===');
    console.log('handleSendToWordPress called with contentId:', contentId);
    
    // Prevent multiple sends at once
    if (isSendingToWP) {
      console.log('Already sending a post to WordPress');
      toast.info("Already sending a post to WordPress");
      return;
    }
    
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
    
    // Use either direct DB settings or context settings
    const settings = directWpSettings || wpSettings;
    
    if (!settings) {
      console.error('WordPress settings not available (neither direct nor context)');
      toast.error("WordPress is not configured. Please set up WordPress connection in Settings.");
      return;
    }
    
    // Check if WordPress is properly configured using our helper function
    if (!isWordPressConfigured()) {
      console.error('WordPress not properly configured:', {
        directSettings: directWpSettings ? {
          // @ts-ignore - Accessing fields from the wordpress_settings table
          isConnected: directWpSettings.is_connected,
          // @ts-ignore - Accessing fields from the wordpress_settings table
          hasUrl: !!directWpSettings.wp_url,
          // @ts-ignore - Accessing fields from the wordpress_settings table
          hasUsername: !!directWpSettings.wp_username,
          // @ts-ignore - Accessing fields from the wordpress_settings table
          hasPassword: !!directWpSettings.wp_application_password
        } : 'Not available',
        contextSettings: wpSettings ? {
          isConnected: wpSettings.is_connected,
          hasUrl: !!wpSettings.wp_url,
          hasUsername: !!wpSettings.wp_username,
          hasPassword: !!wpSettings.wp_application_password
        } : 'Not available'
      });
      toast.error("WordPress is not properly configured. Please check your connection in Settings.");
      return;
    }
    
    console.log('WordPress settings valid, proceeding with send:', { 
      // @ts-ignore - Accessing fields from the wordpress_settings table
      id: settings.id, 
      // @ts-ignore - Accessing fields from the wordpress_settings table
      websiteId: settings.website_id, 
      // @ts-ignore - Accessing fields from the wordpress_settings table
      isConnected: settings.is_connected,
      // @ts-ignore - Accessing fields from the wordpress_settings table
      wpUrl: settings.wp_url?.substring(0, 30) + '...',
      // @ts-ignore - Accessing fields from the wordpress_settings table
      hasUsername: !!settings.wp_username,
      // @ts-ignore - Accessing fields from the wordpress_settings table
      hasPassword: !!settings.wp_application_password
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
      
      // Add more detailed debugging for Edge Function call
      try {
        // Call the Edge Function directly for better error debugging
        console.log('Making direct Edge Function call to wordpress-posts');
        // @ts-ignore - Supabase Edge Function types may not match exactly
        const edgeFunctionResponse = await supabase.functions.invoke('wordpress-posts', {
          body: {
            website_id: currentWebsite.id,
            title,
            content: htmlContent,
            status: 'draft',
            action: 'create'
          }
        });
        
        console.log('Edge Function response:', JSON.stringify(edgeFunctionResponse, null, 2));
        
        if (edgeFunctionResponse.error) {
          console.error('Edge Function error:', edgeFunctionResponse.error);
          toast.error(`Failed to send to WordPress: ${edgeFunctionResponse.error.message}`);
          setIsSendingToWP(false);
          setSendingToWPId(null);
          return;
        }
        
        // Enhanced error handling
        if (!edgeFunctionResponse.data) {
          console.error('No data returned from Edge Function');
          toast.error('No response from WordPress service');
          setIsSendingToWP(false);
          setSendingToWPId(null);
          return;
        }
        
        if (!edgeFunctionResponse.data.success) {
          console.error('WordPress post creation failed:', {
            error: edgeFunctionResponse.data.error,
            message: edgeFunctionResponse.data.message,
            statusCode: edgeFunctionResponse.data.statusCode
          });
          
          let errorMessage = 'Unknown WordPress error';
          
          // Try to extract a more specific error message
          if (edgeFunctionResponse.data.error) {
            if (typeof edgeFunctionResponse.data.error === 'string') {
              errorMessage = edgeFunctionResponse.data.error;
            } else if (edgeFunctionResponse.data.error.message) {
              errorMessage = edgeFunctionResponse.data.error.message;
            }
          } else if (edgeFunctionResponse.data.message) {
            errorMessage = edgeFunctionResponse.data.message;
          }
          
          // Show a helpful error message
          toast.error(`WordPress error: ${errorMessage}`);
          setIsSendingToWP(false);
          setSendingToWPId(null);
          return;
        }
        
        // If we get here, the post was created successfully
        console.log('WordPress post created successfully via direct Edge Function call:', edgeFunctionResponse.data);
        
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
        const storageKey = `calendarContent_${currentWebsite.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedContent));
        setAllContent(updatedContent);
        
        // Show the updated content to the user
        const updatedContentItem = updatedContent.find(item => item.id === contentId);
        if (updatedContentItem) {
          setSelectedContent(updatedContentItem);
        }
        
        toast.success("Content sent to WordPress successfully");
      } catch (directError) {
        console.error("Error in direct Edge Function call:", directError);
        toast.error(`Error sending to WordPress: ${directError instanceof Error ? directError.message : String(directError)}`);
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

  // First fix useEffect to fetch WordPress settings with proper table name
  useEffect(() => {
    const fetchWordPressSettings = async () => {
      if (!currentWebsite) return;
      
      console.log('Directly checking WordPress settings in database for website:', currentWebsite.id);
      
      try {
        // @ts-ignore - Supabase schema doesn't include wordpress_settings in TypeScript types
        const { data, error } = await supabase
          .from('wordpress_settings')
          .select('*')
          .eq('website_id', currentWebsite.id)
          .limit(1);
          
        if (error) {
          if (error.code !== 'PGRST116') { // Not the "no rows returned" error
            console.error('Error fetching WordPress settings from DB:', error);
          } else {
            console.log('No WordPress settings found in database for this website');
          }
        } else if (data && data.length > 0) {
          console.log('WordPress settings found in database:', data[0]);
          
          // Store the direct WordPress settings in state
          setDirectWpSettings(data[0]);
        }
      } catch (e) {
        console.error('Exception checking WordPress settings:', e);
      }
    };
    
    fetchWordPressSettings();
  }, [currentWebsite]);

  // Then fix the improved function to check if WordPress is properly configured
  const isWordPressConfigured = () => {
    console.log('Checking WordPress configuration with direct settings and context...');
    
    // Check if we have direct settings from the database
    if (directWpSettings && 
        directWpSettings.wp_url && 
        directWpSettings.wp_username && 
        directWpSettings.wp_application_password) {
      console.log('WordPress is configured based on direct database settings');
      return true;
    }
    
    // Fall back to context values if direct settings are not available
    if (wpSettings && 
        wpSettings.wp_url && 
        wpSettings.wp_username && 
        wpSettings.wp_application_password) {
      console.log('WordPress is configured based on context values');
      return true;
    }
    
    console.log('WordPress is not configured (neither direct settings nor context has values)');
    return false;
  };

  // Fix the refresh function to manually check WordPress connection
  const refreshWordPressSettings = async () => {
    if (!currentWebsite) {
      toast.error("Please select a website first");
      return;
    }
    
    toast.info("Checking WordPress connection...");
    console.log('Manually refreshing WordPress settings for website:', currentWebsite.id);
    
    try {
      // @ts-ignore - Supabase schema doesn't include wordpress_settings in TypeScript types
      const { data, error } = await supabase
        .from('wordpress_settings')
        .select('*')
        .eq('website_id', currentWebsite.id)
        .single();
        
      if (error) {
        if (error.code !== 'PGRST116') { // Not the "no rows returned" error
          console.error('Error fetching WordPress settings from DB:', error);
          toast.error("Error checking WordPress connection");
        } else {
          console.log('No WordPress settings found in database for this website');
          toast.error("WordPress is not configured for this website");
        }
      } else if (data) {
        console.log('WordPress settings refreshed from database:', {
          // @ts-ignore - Accessing fields from the wordpress_settings table
          url: data.wp_url,
          // @ts-ignore - Accessing fields from the wordpress_settings table
          isConnected: data.is_connected,
          // @ts-ignore - Accessing fields from the wordpress_settings table
          hasUsername: !!data.wp_username,
          // @ts-ignore - Accessing fields from the wordpress_settings table
          hasPassword: !!data.wp_application_password
        });
        
        // Store the WordPress settings
        setDirectWpSettings(data);
        
        // @ts-ignore - Accessing fields from the wordpress_settings table
        if (data.is_connected) {
          toast.success("WordPress connection is active");
        } else {
          toast.warning("WordPress connection exists but is inactive");
        }
      }
    } catch (e) {
      console.error('Exception checking WordPress settings:', e);
      toast.error("Error checking WordPress connection");
    }
  };

  // Update the useEffect dependencies to include directWpSettings
  useEffect(() => {
    console.log('=== WordPress Integration Status Debug ===');
    console.log('Component mounted or WordPress settings changed');
    
    // Log direct DB settings
    console.log('WordPress settings (direct DB):', directWpSettings ? {
      has_settings: true,
      wp_url: directWpSettings.wp_url?.substring(0, 30) + '...',
      has_username: !!directWpSettings.wp_username,
      has_password: !!directWpSettings.wp_application_password,
      is_connected: directWpSettings.is_connected,
      website_id: directWpSettings.website_id
    } : 'No direct settings available');
    
    // Log context settings
    console.log('WordPress settings (context):', wpSettings ? {
      has_settings: true,
      wp_url: wpSettings.wp_url?.substring(0, 30) + '...',
      has_username: !!wpSettings.wp_username,
      has_password: !!wpSettings.wp_application_password,
      is_connected: wpSettings.is_connected,
      website_id: wpSettings.website_id
    } : 'No settings available');
    
    console.log('isWordPressConfigured():', isWordPressConfigured());
    console.log('Current website:', currentWebsite ? {
      id: currentWebsite.id,
      name: currentWebsite.name
    } : 'No website selected');
    
    // Check for any content that might be sendable
    const sendableContent = allContent.filter(item => 
      // Simple check without calling the full function to avoid circular dependency
      isWordPressConfigured() && 
      !isSendingToWP && 
      !(item.contentStatus === 'published' && !!item.wpSentDate) &&
      !!(item.description && item.description.trim().length > 0)
    );
    console.log('Sendable content count:', sendableContent.length);
    console.log('=== End WordPress Integration Status Debug ===');
  }, [wpSettings, directWpSettings, currentWebsite, allContent, isSendingToWP]);

  // Restore the canSendToWordPress function that was accidentally removed
  // Add this function to check if a specific content item can be sent to WordPress
  const canSendToWordPress = (content: CalendarContent) => {
    const issues = [];
    
    // Check if WordPress is configured
    if (!isWordPressConfigured()) {
      issues.push('WordPress not configured');
    }
    
    // Check if we're already sending something
    if (isSendingToWP) {
      issues.push('Already sending to WordPress');
    }
    
    // Check if the content has already been sent
    if (content.contentStatus === 'published' && !!content.wpSentDate) {
      issues.push('Already sent to WordPress');
    }
    
    // Check if the content has actual content to send
    if (!content.description || content.description.trim().length === 0) {
      issues.push('No content to send');
    }
    
    // Log detailed debug info when called (but only occasionally)
    if (Math.random() < 0.1) { // Only log ~10% of the time to avoid console spam
      console.log(`canSendToWordPress for content ID ${content.id}:`, {
        result: issues.length === 0,
        title: content.title,
        issues: issues.length > 0 ? issues : 'None',
        wpConfigured: isWordPressConfigured(),
        hasContent: !!(content.description && content.description.trim().length > 0),
        status: content.contentStatus || content.status,
        alreadySent: !!(content.contentStatus === 'published' && content.wpSentDate)
      });
    }
    
    // All checks passed, can send to WordPress
    return issues.length === 0;
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
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-lg font-medium">Content Overview</CardTitle>
                        {/* Refresh WP button removed - this functionality belongs in WordPress Integration settings */}
                      </div>
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
                                      className={`h-7 w-7 ${
                                        // Change the color based on whether content exists
                                        content.description && content.description.trim().length > 0
                                          ? 'text-blue-600 hover:bg-blue-100 hover:text-blue-700'
                                          : 'text-primary hover:bg-primary/10'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleGenerateContent(content.id);
                                      }}
                                      title={
                                        content.description && content.description.trim().length > 0
                                          ? "Regenerate content with AI"
                                          : "Generate content with AI"
                                      }
                                      disabled={isGeneratingContent}
                                    >
                                      {isGeneratingContent && generatingContentId === content.id ? (
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                      ) : content.description && content.description.trim().length > 0 ? (
                                        // Show a different icon when content already exists
                                        <svg 
                                          width="14" 
                                          height="14" 
                                          viewBox="0 0 24 24" 
                                          fill="none" 
                                          stroke="currentColor" 
                                          strokeWidth="2" 
                                          strokeLinecap="round" 
                                          strokeLinejoin="round"
                                          className="h-3.5 w-3.5"
                                        >
                                          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                                          <path d="m9 12 2 2 4-4" />
                                        </svg>
                                      ) : (
                                        <FileEdit className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-7 w-7 relative z-10 ${
                                        // Apply different styles based on button state
                                        !isWordPressConfigured() 
                                          ? 'text-gray-400 cursor-not-allowed' // Not connected
                                          : content.contentStatus === 'published' && content.wpSentDate 
                                            ? 'text-emerald-800 bg-emerald-50 cursor-default' // Already sent
                                            : canSendToWordPress(content)
                                              ? 'text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700' // Ready to send
                                              : 'text-gray-400 cursor-not-allowed' // Can't send for other reasons
                                      }`}
                                      onClick={(e) => {
                                        // Always stop propagation to prevent table row click
                                        e.stopPropagation();
                                        e.preventDefault();
                                        
                                        // Log click event to help with debugging
                                        console.log('WordPress send button clicked for content:', {
                                          id: content.id,
                                          title: content.title,
                                          canSend: canSendToWordPress(content)
                                        });
                                        
                                        // Only call the handler if allowed to send
                                        if (canSendToWordPress(content)) {
                                          handleSendToWordPress(content.id);
                                        } else {
                                          // Show a helpful message based on why it can't be sent
                                          if (!isWordPressConfigured()) {
                                            toast.error("WordPress connection required. Please configure in Settings.");
                                          } else if (content.contentStatus === 'published' && content.wpSentDate) {
                                            toast.info(`Already sent to WordPress on ${new Date(content.wpSentDate).toLocaleDateString()}`);
                                          } else if (!content.description || content.description.trim().length === 0) {
                                            toast.warning("Generate content first before sending to WordPress");
                                          } else if (isSendingToWP) {
                                            toast.info("Already sending a post to WordPress");
                                          }
                                        }
                                      }}
                                      title={
                                        !isWordPressConfigured()
                                          ? "WordPress connection required"
                                          : content.contentStatus === 'published' && content.wpSentDate
                                            ? `Already sent to WordPress on ${new Date(content.wpSentDate).toLocaleDateString()}`
                                            : !content.description || content.description.trim().length === 0
                                              ? "Generate content first"
                                              : "Send to WordPress"
                                      }
                                      disabled={!canSendToWordPress(content)}
                                      // Add style property with important cursor setting and explicit pointer-events
                                      style={{ cursor: canSendToWordPress(content) ? 'pointer' : 'not-allowed', pointerEvents: 'auto' }}
                                    >
                                      {isSendingToWP && sendingToWPId === content.id ? (
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                                      ) : content.contentStatus === 'published' && content.wpSentDate ? (
                                        <Send className="h-3.5 w-3.5 fill-emerald-800" /> // Use filled icon for sent posts
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
