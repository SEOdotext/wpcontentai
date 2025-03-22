import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, FileEdit, Send, Loader2, RefreshCw, Trash } from 'lucide-react';
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
  // Add new field for WordPress post URL
  wpPostUrl?: string;
}

const ContentCalendar = () => {
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const [selectedContent, setSelectedContent] = useState<CalendarContent | null>(null);
  const [allContent, setAllContent] = useState<CalendarContent[]>([]);
  const [isGeneratingContent, setIsGeneratingContent] = useState<boolean>(false);
  const [generatingContentId, setGeneratingContentId] = useState<number | null>(null);
  const [isSendingToWP, setIsSendingToWP] = useState<boolean>(false);
  const [sendingToWPId, setSendingToWPId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'not-generated' | 'not-sent'>('all');
  const { currentWebsite } = useWebsites();
  const { createPost, settings: wpSettings } = useWordPress();
  const [directWpSettings, setDirectWpSettings] = useState<any>(null);
  const { writingStyle, wordpressTemplate } = useSettings();
  // Add memoized state for WordPress configuration
  const [wpConfigured, setWpConfigured] = useState<boolean>(false);
  
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
    // First set the generating state to show spinners immediately
    setIsGeneratingContent(true);
    setGeneratingContentId(contentId);
    
    // Then call the generation function
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
    
    // Check if WordPress is properly configured using cached state
    if (!wpConfigured) {
      console.error('WordPress not properly configured');
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
        
        // Get publish status from WordPress settings instead of hardcoding to 'draft'
        // @ts-ignore - Accessing publish_status field from settings
        const postStatus = settings.publish_status || 'draft'; // Fall back to draft if not set
        console.log(`Using WordPress post status from settings: ${postStatus}`);
        
        // @ts-ignore - Supabase Edge Function types may not match exactly
        const edgeFunctionResponse = await supabase.functions.invoke('wordpress-posts', {
          body: {
            website_id: currentWebsite.id,
            title,
            content: htmlContent,
            status: postStatus, // Use the status from settings
            action: 'create'
          }
        });
        
        console.log('Edge Function request payload:', {
          website_id: currentWebsite.id,
          title: title.substring(0, 30) + '...',
          contentLength: htmlContent.length,
          status: postStatus,
          action: 'create'
        });
        console.log('Edge Function response:', JSON.stringify(edgeFunctionResponse, null, 2));
        
        if (edgeFunctionResponse.error) {
          console.error('Edge Function error:', edgeFunctionResponse.error);
          const errorMsg = edgeFunctionResponse.error.message || 'Unknown error occurred';
          toast.error(`Failed to send to WordPress: ${errorMsg}`);
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
        
        // Extract post URL from response if available
        let wpPostUrl = undefined;
        
        console.log('Extracting WordPress post URL from response:', edgeFunctionResponse.data);
        
        // Handle multiple potential response formats
        if (edgeFunctionResponse.data.post) {
          // Modern format with post object
          if (edgeFunctionResponse.data.post.link) {
            // Direct link to the post
            wpPostUrl = edgeFunctionResponse.data.post.link;
            console.log('WordPress post URL from post.link:', wpPostUrl);
          } else if (edgeFunctionResponse.data.post.id) {
            // If we have post ID but no link, construct admin URL
            // @ts-ignore - Accessing wp_url field from settings
            const wpAdminBaseUrl = settings.wp_url?.replace(/\/$/, '') || '';
            if (wpAdminBaseUrl) {
              wpPostUrl = `${wpAdminBaseUrl}/wp-admin/post.php?post=${edgeFunctionResponse.data.post.id}&action=edit`;
              console.log('Constructed WordPress admin URL from post ID:', wpPostUrl);
            }
          }
        } else if (edgeFunctionResponse.data.link) {
          // Direct link in response root
          wpPostUrl = edgeFunctionResponse.data.link;
          console.log('WordPress post URL from response.link:', wpPostUrl);
        } else if (edgeFunctionResponse.data.id) {
          // ID in response root
          // @ts-ignore - Accessing wp_url field from settings
          const wpAdminBaseUrl = settings.wp_url?.replace(/\/$/, '') || '';
          if (wpAdminBaseUrl) {
            wpPostUrl = `${wpAdminBaseUrl}/wp-admin/post.php?post=${edgeFunctionResponse.data.id}&action=edit`;
            console.log('Constructed WordPress admin URL from response ID:', wpPostUrl);
          }
        } else if (edgeFunctionResponse.data.data && edgeFunctionResponse.data.data.post) {
          // Handle nested post object format
          if (edgeFunctionResponse.data.data.post.link) {
            wpPostUrl = edgeFunctionResponse.data.data.post.link;
            console.log('WordPress post URL from data.post.link:', wpPostUrl);
          } else if (edgeFunctionResponse.data.data.post.id) {
            // @ts-ignore - Accessing wp_url field from settings
            const wpAdminBaseUrl = settings.wp_url?.replace(/\/$/, '') || '';
            if (wpAdminBaseUrl) {
              wpPostUrl = `${wpAdminBaseUrl}/wp-admin/post.php?post=${edgeFunctionResponse.data.data.post.id}&action=edit`;
              console.log('Constructed WordPress admin URL from nested post ID:', wpPostUrl);
            }
          }
        } else if (edgeFunctionResponse.data.url) {
          // Direct URL property
          wpPostUrl = edgeFunctionResponse.data.url;
          console.log('WordPress post URL from response.url:', wpPostUrl);
        }
        
        // Add a fallback URL to WordPress admin if nothing else is available
        // @ts-ignore - Accessing wp_url field from settings
        if (!wpPostUrl && settings.wp_url) {
          // @ts-ignore - Accessing wp_url field from settings
          const wpAdminBaseUrl = settings.wp_url.replace(/\/$/, '');
          wpPostUrl = `${wpAdminBaseUrl}/wp-admin/edit.php`;
          console.log('Fallback to WordPress admin posts list:', wpPostUrl);
        }
        
        // Update the content status to indicate it's been sent to WordPress
        const updatedContent = allContent.map(item => 
          item.id === contentId 
            ? { 
                ...item, 
                contentStatus: 'published' as const,
                wpSentDate: new Date().toISOString(),
                wpPostUrl: wpPostUrl // Store the WordPress post URL
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
    } catch (e) {
      console.error('Exception in sendToWordPress:', e);
      toast.error('Error sending to WordPress');
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
      
      try {
        // Use proper typing for wordpress_settings
        const { data, error } = await supabase
          .from('wordpress_settings')
          .select('*')
          .eq('website_id', currentWebsite.id)
          .limit(1);
          
        if (error) {
          if (error.code !== 'PGRST116') { // Not the "no rows returned" error
            console.error('Error fetching WordPress settings from DB:', error);
          }
        } else if (data && data.length > 0) {
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
    // Check if we have direct settings from the database
    if (directWpSettings && 
        directWpSettings.wp_url && 
        directWpSettings.wp_username && 
        directWpSettings.wp_application_password) {
      return true;
    }
    
    // Fall back to context values if direct settings are not available
    if (wpSettings && 
        wpSettings.wp_url && 
        wpSettings.wp_username && 
        wpSettings.wp_application_password) {
      return true;
    }
    
    return false;
  };

  // Fix the refresh function to manually check WordPress connection
  const refreshWordPressSettings = async () => {
    if (!currentWebsite) {
      toast.error("Please select a website first");
      return;
    }
    
    toast.info("Checking WordPress connection...");
    
    try {
      // Use proper typing for wordpress_settings
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
          toast.error("WordPress is not configured for this website");
        }
      } else if (data) {
        // Store the WordPress settings
        setDirectWpSettings(data);
        
        // Use proper typing for wordpress_settings fields
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

  // Update the useEffect to cache the configuration result
  useEffect(() => {
    // Store the result in state to avoid recalculating it repeatedly
    setWpConfigured(isWordPressConfigured());
    
    // WordPress integration status monitoring
    // Check for any content that might be sendable
    const sendableContent = allContent.filter(item => 
      // Use the cached value instead of calling the function
      wpConfigured && 
      !isSendingToWP && 
      !(item.contentStatus === 'published' && !!item.wpSentDate) &&
      !!(item.description && item.description.trim().length > 0)
    );
  }, [wpSettings, directWpSettings, currentWebsite, allContent, isSendingToWP]);

  // Restore the canSendToWordPress function that was accidentally removed
  // Add this function to check if a specific content item can be sent to WordPress
  const canSendToWordPress = (content: CalendarContent) => {
    const issues = [];
    
    // Check if WordPress is configured - use the cached value
    if (!wpConfigured) {
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
    
    // All checks passed, can send to WordPress
    return issues.length === 0;
  };

  // Add a function to filter content based on view mode
  const getFilteredContent = (content: CalendarContent[]) => {
    switch (viewMode) {
      case 'not-generated':
        return content.filter(item => !item.description);
      case 'not-sent':
        return content.filter(item => !item.wpSentDate);
      default:
        return content;
    }
  };

  // Get the appropriate view title and description
  const getViewInfo = () => {
    switch (viewMode) {
      case 'not-generated':
        return {
          title: "Not Generated",
          description: "Content items that haven't been generated yet."
        };
      case 'not-sent':
        return {
          title: "Not Sent",
          description: "Content that hasn't been sent to WordPress yet."
        };
      default:
        return {
          title: "All Content",
          description: "Showing all calendar content."
        };
    }
  };

  const viewInfo = getViewInfo();

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
                    <div className="mb-4 flex justify-between items-center">
                      <div></div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant={viewMode === 'all' ? "default" : "ghost"}
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => setViewMode('all')}
                        >
                          All
                        </Button>
                        <Button
                          variant={viewMode === 'not-generated' ? "default" : "ghost"}
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => setViewMode('not-generated')}
                        >
                          Not Generated
                        </Button>
                        <Button
                          variant={viewMode === 'not-sent' ? "default" : "ghost"}
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => setViewMode('not-sent')}
                        >
                          Not Sent
                        </Button>
                      </div>
                    </div>
                    
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
                          {getFilteredContent(getContentByMonth(displayDate)).length > 0 ? (
                            getFilteredContent(getContentByMonth(displayDate)).map((content, index) => (
                              <TableRow 
                                key={content.id || index} 
                                className="cursor-pointer hover:bg-accent/30"
                              >
                                <TableCell className="font-medium">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className={cn(
                                          "justify-start text-left font-normal",
                                          !content.date && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {content.date ? format(new Date(content.date), 'PPP') : <span>Pick a date</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={content.date ? new Date(content.date) : undefined}
                                        onSelect={(date) => handleDateChange(content.id, date)}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </TableCell>
                                <TableCell onClick={() => handleContentClick(content)}>{content.title}</TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end gap-1">
                                    {/* Only show Generate/Regenerate button when content hasn't been sent to WordPress */}
                                    {!(content.contentStatus === 'published' && !!content.wpSentDate) && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRegenerateContent(content.id);
                                        }}
                                        disabled={isGeneratingContent && generatingContentId === content.id}
                                        className="h-8 w-8 text-slate-500 hover:text-primary"
                                        title={isGeneratingContent && generatingContentId === content.id 
                                          ? "Generating content..." 
                                          : content.description && content.description.trim().length > 0
                                            ? "Regenerate content with AI"
                                            : "Generate content with AI"}
                                      >
                                        {isGeneratingContent && generatingContentId === content.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : content.description && content.description.trim().length > 0 ? (
                                          <RefreshCw className="h-4 w-4" />
                                        ) : (
                                          <FileEdit className="h-4 w-4" />
                                        )}
                                      </Button>
                                    )}
                                    
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendToWordPress(content.id);
                                      }}
                                      disabled={!canSendToWordPress(content) || (isSendingToWP && sendingToWPId === content.id)}
                                      className={`h-8 w-8 ${
                                        content.contentStatus === 'published' && !!content.wpSentDate
                                          ? 'text-emerald-800 bg-emerald-50'
                                          : canSendToWordPress(content)
                                            ? 'text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700'
                                            : 'text-slate-300 cursor-not-allowed'
                                      }`}
                                      title={
                                        content.contentStatus === 'published' && !!content.wpSentDate
                                          ? `Sent to WordPress${content.wpSentDate ? ` on ${format(new Date(content.wpSentDate), 'PPP')}` : ''}`
                                          : "Send to WordPress"
                                      }
                                    >
                                      {isSendingToWP && sendingToWPId === content.id ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                                      ) : content.contentStatus === 'published' && !!content.wpSentDate ? (
                                        <Send className="h-4 w-4 fill-emerald-800" />
                                      ) : (
                                        <Send className="h-4 w-4" />
                                      )}
                                    </Button>
                                    
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteContent(content.id);
                                      }}
                                      className="h-8 w-8 text-slate-500 hover:text-destructive"
                                      title="Delete content"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center">
                                No content {viewMode !== 'all' ? `matching "${viewInfo.title}" filter` : ''} scheduled for this month
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
          onRegenerateClick={() => handleRegenerateContent(selectedContent.id)}
          onSendToWordPress={() => handleSendToWordPress(selectedContent.id)}
          fullContent={selectedContent.description}
          wpSentDate={selectedContent.wpSentDate}
          wpPostUrl={selectedContent.wpPostUrl}
          isGeneratingContent={isGeneratingContent && generatingContentId === selectedContent.id}
          isSendingToWP={isSendingToWP && sendingToWPId === selectedContent.id}
          canSendToWordPress={canSendToWordPress(selectedContent)}
        />
      )}
    </SidebarProvider>
  );
};

export default ContentCalendar;
