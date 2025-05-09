import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, FileEdit, Send, Loader2, RefreshCw, Trash, Image, Plus, Sparkles } from 'lucide-react';
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
import { usePostThemes } from '@/context/PostThemesContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { generateImage, checkWebsiteImageGenerationEnabled, generateAndPublishContent } from '@/api/aiEndpoints';
import { PostTheme } from '@/context/PostThemesContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { canSendToWordPress } from '@/utils/wordpress';

interface Keyword {
  text: string;
}

interface CalendarContent {
  id: string;
  title: string;
  description: string;
  dateCreated: string;
  date: string;
  contentStatus: 'draft' | 'published' | 'scheduled' | 'content-ready' | 'generated' | 'declined' | 'generatingidea';
  keywords: Keyword[];
  categories: string[];
  wpSentDate?: string;
  wpPostUrl?: string;
  preview_image_url?: string;
  status: 'pending' | 'approved' | 'published' | 'textgenerated' | 'generated' | 'declined' | 'generatingidea';
}

interface WordPressSettings {
  id: string;
  website_id: string;
  wp_url: string;
  wp_username: string;
  wp_application_password: string;
  is_connected: boolean;
  publish_status?: string;
  created_at: string;
  updated_at: string;
  categories?: { id: number; name: string; slug: string }[];
  last_post_at?: string;
}

const ContentCalendar = () => {
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const [selectedContent, setSelectedContent] = useState<CalendarContent | null>(null);
  const [allContent, setAllContent] = useState<CalendarContent[]>([]);
  const [generatingImageIds, setGeneratingImageIds] = useState<Set<string>>(new Set());
  const [isSendingToWP, setIsSendingToWP] = useState(false);
  const [sendingToWPId, setSendingToWPId] = useState<string | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatingContentId, setGeneratingContentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'not-generated' | 'not-sent' | 'sent'>('all');
  const { currentWebsite } = useWebsites();
  const { 
    postThemes, 
    isLoading, 
    error, 
    fetchPostThemes, 
    addPostTheme, 
    updatePostTheme, 
    deletePostTheme, 
    generateContent,
    setPostThemes,
    isGeneratingContent: isThemeGeneratingContent,
    sendToWordPress
  } = usePostThemes();
  const { publicationFrequency } = useSettings();
  const [directWpSettings, setDirectWpSettings] = useState<WordPressSettings | null>(null);
  const [wpConfigured, setWpConfigured] = useState<boolean>(false);
  const [generatingAndPublishingIds, setGeneratingAndPublishingIds] = useState<Set<string>>(new Set());
  const [activeSubscriptions, setActiveSubscriptions] = useState<{ [key: string]: { unsubscribe: () => void } }>({});
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const selectedContentId = searchParams.get('content');
  
  // Clean up any active subscriptions when component unmounts
  useEffect(() => {
    return () => {
      // Unsubscribe from all active channels when component unmounts
      Object.values(activeSubscriptions).forEach(subscription => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      });
    };
  }, [activeSubscriptions]);
  
  // Set up realtime when component loads
  useEffect(() => {
    console.log('Setting up test channel for realtime functionality');
    
    // Create a test channel with a unique name
    const testChannelId = `test-channel-${Math.random().toString(36).substring(2, 11)}`;
    const setupChannel = supabase.channel(testChannelId);
    
    setupChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'publish_queue'
        },
        (payload) => {
          console.log('Realtime test payload received:', payload);
        }
      )
      .subscribe((status) => {
        console.log(`Realtime test connection status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime is working correctly for publish_queue table');
          console.log('🔍 Debug info: If your realtime subscriptions are working but database queries are failing, check your RLS policies');
          
          // Once we've verified the subscription works, clean it up
          setTimeout(() => {
            setupChannel.unsubscribe();
            console.log('Test channel unsubscribed');
          }, 5000);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error - publish_queue table might not have realtime enabled');
          console.error('📋 Steps to enable realtime:');
          console.error('1. Go to Supabase Dashboard -> Database -> Replication');
          console.error('2. Enable realtime and select the publish_queue table');
          console.error('3. Restart your Supabase project or the realtime service');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Realtime subscription timed out - check your network connection');
        } else if (status === 'CLOSED') {
          console.log('Realtime test channel closed');
        }
      });
    
    return () => {
      setupChannel.unsubscribe();
    };
  }, []);
  
  // Filter post themes to show approved and textgenerated ones
  const approvedPostThemes = postThemes.filter(theme => 
    theme.status === 'approved' || 
    theme.status === 'textgenerated' || 
    theme.status === 'generated' || 
    theme.status === 'published'
  );
  
  // Use approvedPostThemes instead of postThemes in the calendar view
  const calendarContent = approvedPostThemes.map(theme => ({
    id: theme.id,
    title: theme.subject_matter,
    description: theme.post_content || '',
    dateCreated: theme.created_at,
    date: theme.scheduled_date,
    contentStatus: theme.status === 'textgenerated' || theme.status === 'generated' ? 'content-ready' : 
                  theme.status === 'published' ? 'published' : 'scheduled',
    keywords: theme.keywords.map(k => ({ text: k })),
    categories: theme.categories.map(c => c.name),
    wpSentDate: theme.wp_sent_date,
    wpPostUrl: theme.wp_post_url,
    preview_image_url: theme.image,
    status: theme.status
  }));

  // Update allContent only when calendarContent changes
  useEffect(() => {
    const hasChanged = JSON.stringify(calendarContent) !== JSON.stringify(allContent);
    if (hasChanged) {
      setAllContent(calendarContent);
    }
  }, [calendarContent]);

  // Memoize the content filtering functions
  const getContentByMonth = React.useCallback((date: Date) => {
    if (!allContent || allContent.length === 0) {
      return [];
    }
    
    const month = date.getMonth();
    const year = date.getFullYear();
    
    return allContent.filter(content => {
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
  }, [allContent]);

  const getFilteredContent = React.useCallback((content: CalendarContent[]) => {
    switch (viewMode) {
      case 'not-generated':
        return content.filter(item => !item.description || item.description.trim().length === 0);
      case 'not-sent':
        return content.filter(item => !item.wpSentDate);
      case 'sent':
        return content.filter(item => item.wpSentDate);
      default:
        return content;
    }
  }, [viewMode]);

  // Memoize the filtered content
  const filteredContent = React.useMemo(() => {
    const monthContent = getContentByMonth(displayDate);
    return getFilteredContent(monthContent);
  }, [displayDate, getContentByMonth, getFilteredContent]);

  // Memoize the view info
  const viewInfo = React.useMemo(() => {
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
      case 'sent':
        return {
          title: "Sent",
          description: "Content that has been sent to WordPress."
        };
      default:
        return {
          title: "All Content",
          description: "Showing all calendar content."
        };
    }
  }, [viewMode]);

  // Memoize the WordPress configuration check
  const isWordPressConfigured = React.useCallback(() => {
    if (directWpSettings && 
        directWpSettings.wp_url && 
        directWpSettings.wp_username && 
        directWpSettings.wp_application_password) {
      return true;
    }
    return false;
  }, [directWpSettings]);

  // Update WordPress configuration only when needed
  useEffect(() => {
    setWpConfigured(isWordPressConfigured());
  }, [isWordPressConfigured]);

  // Memoize the canSendToWordPress function
  const canSendToWP = React.useCallback((content: CalendarContent) => {
    return canSendToWordPress({
      id: content.id,
      wp_post_url: content.wpPostUrl,
      wp_sent_date: content.wpSentDate,
      description: content.description
    }, wpConfigured, isSendingToWP);
  }, [wpConfigured, isSendingToWP]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setDisplayDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  // Update selectedContent when URL changes
  useEffect(() => {
    if (selectedContentId) {
      const content = allContent.find(c => c.id === selectedContentId);
      if (content) {
        setSelectedContent(content);
      }
    } else {
      setSelectedContent(null);
    }
  }, [selectedContentId, allContent]);

  const handleContentClick = (content: CalendarContent) => {
    navigate(`/calendar?content=${content.id}`);
  };

  const handleCloseContent = () => {
    navigate('/calendar');
  };

  const handleDeleteContent = (contentId: string) => {
    if (!currentWebsite) return;
    
    // Call the deletePostTheme function from context
    deletePostTheme(contentId)
      .then(success => {
        if (success) {
          // Clear selected content if it was deleted
          if (selectedContent && selectedContent.id === contentId) {
            setSelectedContent(null);
          }
        }
      })
      .catch(error => {
        console.error('Error deleting content:', error);
        toast.error('Failed to delete content');
      });
  };

  const handleEditContent = (contentId: string) => {
    toast.info("Edit functionality will be implemented soon");
  };

  const handleRegenerateContent = (contentId: string) => {
    // Call the generation function directly
    handleGenerateContent(contentId);
  };

  const handleGenerateContent = async (contentId: string) => {
    try {
      setIsGeneratingContent(true);
      setGeneratingContentId(contentId);
      console.log('Starting content generation for contentId:', contentId);

      // Find the corresponding post theme - use UUID directly
      const theme = postThemes.find(t => t.id === contentId);
      if (!theme) {
        console.error('Post theme not found for contentId:', contentId);
        throw new Error('Post theme not found');
      }

      console.log('Found post theme:', {
        id: theme.id,
        subjectMatter: theme.subject_matter,
        keywords: theme.keywords,
        status: theme.status
      });

      // Generate content using the PostThemesContext
      console.log('Calling generateContent with theme ID:', theme.id);
      const updatedTheme = await generateContent(theme.id);
      
      console.log('Content generation result:', updatedTheme);
      
      if (updatedTheme && updatedTheme.post_content) {
        // Update the local state immediately with the new content
        setPostThemes(prev => 
          prev.map(t => t.id === theme.id ? updatedTheme : t)
        );

        // Update selectedContent if this is the currently selected item
        if (selectedContent?.id === contentId) {
          setSelectedContent(prev => ({
            ...prev!,
            description: updatedTheme.post_content || '',
            contentStatus: updatedTheme.status === 'textgenerated' ? 'content-ready' : 'draft',
            status: updatedTheme.status
          }));
        }
        
        toast.success('Content generated successfully');
      } else {
        throw new Error('No content was generated');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content');
    } finally {
      setIsGeneratingContent(false);
      setGeneratingContentId(null);
    }
  };

  const handleDateChange = async (contentId: string, newDate: Date) => {
    try {
      // Find the corresponding post theme
      const theme = postThemes.find(t => t.id === contentId);
      if (!theme) {
        throw new Error('Post theme not found');
      }

      // Update the scheduled date using the PostThemesContext
      const success = await updatePostTheme(theme.id, { scheduled_date: newDate.toISOString() });
      
      if (success) {
        // Refresh the post themes to get the updated date
        await fetchPostThemes();
        
        toast.success('Date updated successfully');
      } else {
        throw new Error('Failed to update date');
      }
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Failed to update date');
    }
  };

  const handleSendToWordPress = async (contentId: string) => {
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

    if (!currentWebsite) {
      console.error('No website selected');
      toast.error("Please select a website first");
      return;
    }
    
    // Use either direct DB settings or context settings
    const settings = directWpSettings;
    
    if (!settings) {
      console.error('WordPress settings not available');
      toast.error("WordPress is not configured. Please set up WordPress connection in Settings.");
      return;
    }
    
    // Check if WordPress is properly configured using cached state
    if (!wpConfigured) {
      console.error('WordPress not properly configured');
      toast.error("WordPress is not properly configured. Please check your connection in Settings.");
      return;
    }

    try {
      setSendingToWPId(contentId);
      setIsSendingToWP(true);
      
      // Find the corresponding post theme
      const theme = postThemes.find(t => t.id === contentId);
      if (!theme) {
        throw new Error('Post theme not found');
      }

      // Send to WordPress using the PostThemesContext
      const success = await sendToWordPress(theme.id);
      
      if (success) {
        // Refresh the post themes to get the updated status
        await fetchPostThemes();
        
        toast.success('Content sent to WordPress successfully');
      } else {
        throw new Error('Failed to send to WordPress');
      }
    } catch (error) {
      console.error('Error sending to WordPress:', error);
      toast.error('Failed to send content to WordPress');
    } finally {
      setIsSendingToWP(false);
      setSendingToWPId(null);
    }
  };

  // First fix useEffect to fetch WordPress settings with proper table name
  useEffect(() => {
    const fetchWordPressSettings = async () => {
      if (!currentWebsite) return;
      
      try {
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

  const handleGenerateImage = async (contentId: string) => {
    if (!currentWebsite?.enable_ai_image_generation) {
      toast.error('AI image generation is not enabled for this website');
      return;
    }

    try {
      // Add this contentId to the set of generating images
      setGeneratingImageIds(prev => new Set(prev).add(contentId));

      const content = allContent.find(item => item.id === contentId);
      if (!content) {
        toast.error('Content not found');
        // Remove contentId from generating set if content not found
        setGeneratingImageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(contentId);
          return newSet;
        });
        return;
      }

      // Call the Edge Function to generate the image
      const result = await generateImage({
        content: '',  // Not needed anymore as we pass postId
        postId: contentId,
        websiteId: currentWebsite.id
      });

      console.log('Image generation result:', result);

      if (result.isGenerating) {
        // Start polling for status updates
        const pollInterval = setInterval(async () => {
          try {
            // Check the database directly for the image status
            const { data: postTheme, error } = await supabase
              .from('post_themes')
              .select('image')
              .eq('id', contentId)
              .single() as { data: Pick<PostTheme, 'image'> | null, error: any };

            if (error) {
              console.error('Error checking image status:', error);
              clearInterval(pollInterval);
              // Remove from generating images set on error
              setGeneratingImageIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(contentId);
                return newSet;
              });
              return;
            }

            console.log('Image generation status:', postTheme);

            if (postTheme?.image) {
              // Image is ready, update the UI
              const updatedContent = allContent.map(item =>
                item.id === contentId
                  ? { ...item, preview_image_url: postTheme.image }
                  : item
              );

              setAllContent(updatedContent);

              // Update selected content if this is the currently selected item
              if (selectedContent?.id === contentId) {
                setSelectedContent(updatedContent.find(item => item.id === contentId)!);
              }

              // Save to localStorage
              const storageKey = `calendarContent_${currentWebsite.id}`;
              localStorage.setItem(storageKey, JSON.stringify(updatedContent));

              toast.success('Image generated successfully');
              clearInterval(pollInterval);
              
              // Remove from generating images set only when complete
              setGeneratingImageIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(contentId);
                return newSet;
              });
            }
          } catch (error) {
            console.error('Error checking image status:', error);
            clearInterval(pollInterval);
            // Remove from generating images set on error
            setGeneratingImageIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(contentId);
              return newSet;
            });
          }
        }, 5000); // Poll every 5 seconds

        // Clear interval after 5 minutes (timeout)
        setTimeout(() => {
          clearInterval(pollInterval);
          toast.error('Image generation timed out');
          // Remove from generating images set on timeout
          setGeneratingImageIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(contentId);
            return newSet;
          });
        }, 5 * 60 * 1000);
      } else if (result.imageUrl) {
        // Image was generated immediately
        const updatedContent = allContent.map(item =>
          item.id === contentId
            ? { ...item, preview_image_url: result.imageUrl }
            : item
        );

        setAllContent(updatedContent);

        if (selectedContent?.id === contentId) {
          setSelectedContent(updatedContent.find(item => item.id === contentId)!);
        }

        const storageKey = `calendarContent_${currentWebsite.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedContent));

        toast.success('Image generated successfully');
        
        // Remove from generating images set since generation is complete
        setGeneratingImageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(contentId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
      
      // Remove from generating images set on error
      setGeneratingImageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contentId);
        return newSet;
      });
    }
  };

  const handleGenerateAndPublish = async (postThemeId: string) => {
    try {
      if (!currentWebsite?.id) {
        toast.error('No website selected');
        return;
      }

      // Add this contentId to the set of generating and publishing
      setGeneratingAndPublishingIds(prev => new Set(prev).add(postThemeId));
      
      // Start the generation process
      const response = await generateAndPublishContent(postThemeId, currentWebsite.id);
      console.log('Content generation queued:', response);
      
      if (response.queueJob && response.queueJob.id) {
        const queueJobId = response.queueJob.id;
        
        // Find the post theme to get the subject matter
        const postTheme = postThemes.find(theme => theme.id === postThemeId);
        const subjectMatter = postTheme?.subject_matter || 'this content';
        
        // Show success toast with additional information
        toast.success(`Content generation and publishing job added to queue`, {
          description: `For "${subjectMatter}" - you can now exit the page and this will finish in the background.`
        });
        
        // Check job status immediately first - it might have completed already
        try {
          const { data: jobStatus, error } = await supabase
            .from('publish_queue')
            .select('*')
            .eq('id', queueJobId)
            .single();
          
          if (error) {
            console.error('Error checking initial job status:', error);
          } else {
            console.log('Initial job status check:', jobStatus);
            
            // If job is already completed, handle it immediately
            if (jobStatus && (jobStatus.status === 'completed' || jobStatus.status === 'failed')) {
              console.log(`Job ${queueJobId} already ${jobStatus.status}, handling immediately`);
              
              // Remove from generating set
              setGeneratingAndPublishingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(postThemeId);
                return newSet;
              });
              
              // Show appropriate notification
              if (jobStatus.status === 'completed') {
                toast.success('Content generated and published successfully!');
              } else {
                toast.error(`Failed to generate and publish content: ${jobStatus.error || 'Unknown error'}`);
              }
              
              // Refresh post themes to get the latest data
              fetchPostThemes();
              
              return; // Exit early - no need to set up subscription for completed job
            }
          }
        } catch (queryError) {
          console.error('Exception checking job status:', queryError);
        }
        
        // Set up Supabase Realtime subscription for the specific queue job ID
        const channel = supabase.channel(`queue-job-${queueJobId}`);
        console.log(`Setting up realtime subscription for queue job ${queueJobId}`);
        
        channel
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'publish_queue',
              filter: `id=eq.${queueJobId}`
            },
            (payload) => {
              console.log('Publish queue UPDATE received for job:', payload);
              const status = payload.new.status;
              
              // Process the update
              if (status === 'completed' || status === 'failed') {
                console.log(`Job ${queueJobId} is now ${status}, handling update`);
                
                // Remove the id from generating set
                setGeneratingAndPublishingIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(postThemeId);
                  return newSet;
                });
                
                // Show appropriate notification
                if (status === 'completed') {
                  toast.success('Content generated and published successfully!');
                } else {
                  toast.error(`Failed to generate and publish content: ${payload.new.error || 'Unknown error'}`);
                }
                
                // Refresh post themes to get the latest data
                fetchPostThemes();
                
                // Remove from active subscriptions
                setActiveSubscriptions(prev => {
                  const newSubscriptions = { ...prev };
                  delete newSubscriptions[queueJobId];
                  return newSubscriptions;
                });
                
                // Unsubscribe from this channel
                channel.unsubscribe();
              }
            }
          )
          .subscribe((status) => {
            console.log(`Realtime subscription status for job ${queueJobId}:`, status);
          });
        
        // Add to active subscriptions
        setActiveSubscriptions(prev => ({
          ...prev,
          [queueJobId]: { unsubscribe: () => channel.unsubscribe() }
        }));
        
        // Set a safety timeout to unsubscribe and update UI after 30 seconds
        // This is a safety net in case realtime doesn't work
        setTimeout(async () => {
          // Check if the id is still in the generating set
          if (generatingAndPublishingIds.has(postThemeId)) {
            console.log(`Safety timeout reached for job ${queueJobId}, checking final status...`);
            
            // Check the status one last time
            try {
              const { data: finalStatus, error } = await supabase
                .from('publish_queue')
                .select('*')
                .eq('id', queueJobId)
                .single();
              
              if (error) {
                console.error('Error checking final job status:', error);
                toast.info('Generation status unknown. Please check back later.');
              } else {
                console.log('Final status check:', finalStatus);
                
                if (finalStatus && (finalStatus.status === 'completed' || finalStatus.status === 'failed')) {
                  // Remove from generating set
                  setGeneratingAndPublishingIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(postThemeId);
                    return newSet;
                  });
                  
                  // Show appropriate notification
                  if (finalStatus.status === 'completed') {
                    toast.success('Content generated and published successfully!');
                  } else {
                    toast.error(`Failed to generate and publish content: ${finalStatus.error || 'Unknown error'}`);
                  }
                } else {
                  toast.info('Generation status unknown. Please check back later.');
                }
              }
            } catch (queryError) {
              console.error('Exception checking final job status:', queryError);
              toast.info('Generation status unknown. Please check back later.');
            }
            
            // Refresh post themes regardless
            fetchPostThemes();
            
            // Remove from active subscriptions
            setActiveSubscriptions(prev => {
              const newSubscriptions = { ...prev };
              delete newSubscriptions[queueJobId];
              return newSubscriptions;
            });
            
            // Unsubscribe from the channel
            channel.unsubscribe();
          }
        }, 30 * 1000); // 30 seconds timeout instead of 5 minutes
      } else {
        toast.warning('No queue job ID returned. Progress monitoring is not available.');
        
        // Refresh the content after a delay
        setTimeout(() => {
          fetchPostThemes();
          
          // Remove this contentId from the set of generating and publishing
          setGeneratingAndPublishingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(postThemeId);
            return newSet;
          });
        }, 30000); // Wait 30 seconds before refreshing
      }
    } catch (error) {
      console.error('Error generating and publishing content:', error);
      toast.error('Failed to generate and publish content');
      
      // Remove this contentId from the set of generating and publishing
      setGeneratingAndPublishingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(postThemeId);
        return newSet;
      });
    }
  };

  const handleDeleteImage = async (contentId: string) => {
    try {
      // Update the post theme to remove the image
      const { error } = await supabase
        .from('post_themes')
        .update({ image: null })
        .eq('id', contentId);

      if (error) throw error;

      // Update local state
      setPostThemes(prev => 
        prev.map(theme => 
          theme.id === contentId 
            ? { ...theme, image: null }
            : theme
        )
      );

      // Update selected content if this is the currently selected item
      if (selectedContent?.id === contentId) {
        setSelectedContent(prev => prev ? { ...prev, preview_image_url: undefined } : null);
      }

      toast.success('Image removed successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to remove image');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
                        <Button
                          variant={viewMode === 'sent' ? "default" : "ghost"}
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => setViewMode('sent')}
                        >
                          Sent
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
                          {filteredContent.length > 0 ? (
                            filteredContent.map((content, index) => (
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
                                      <div className="flex items-center space-x-2 mb-4">
                                        <Calendar
                                          mode="single"
                                          selected={content.date ? new Date(content.date) : undefined}
                                          onSelect={(date) => {
                                            if (date) {
                                              handleDateChange(content.id, date);
                                            }
                                          }}
                                          initialFocus
                                        />
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </TableCell>
                                <TableCell onClick={() => handleContentClick(content)}>{content.title}</TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end gap-1">
                                    {/* Only show Generate/Regenerate button when content hasn't been sent to WordPress */}
                                    {!(content.wpSentDate || content.wpPostUrl) && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRegenerateContent(content.id);
                                        }}
                                        disabled={isThemeGeneratingContent(String(content.id))}
                                        className="h-8 w-8 text-slate-500 hover:text-primary"
                                        title={isThemeGeneratingContent(String(content.id))
                                          ? "Generating content..." 
                                          : content.description && content.description.trim().length > 0
                                            ? "Regenerate content with AI"
                                            : "Generate content with AI"}
                                      >
                                        {isThemeGeneratingContent(String(content.id)) ? (
                                          <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                          </div>
                                        ) : content.description && content.description.trim().length > 0 ? (
                                          <RefreshCw className="h-4 w-4" />
                                        ) : (
                                          <FileEdit className="h-4 w-4" />
                                        )}
                                      </Button>
                                    )}
                                    {/* Image Status Icon */}
                                    {!(content.wpSentDate || content.wpPostUrl) && 
                                     content.description && 
                                     currentWebsite?.enable_ai_image_generation && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleGenerateImage(content.id);
                                        }}
                                        disabled={generatingImageIds.has(content.id)}
                                        className={`h-8 w-8 ${
                                          content.preview_image_url
                                            ? 'text-purple-800 bg-purple-50 cursor-default'
                                            : 'text-purple-600 hover:bg-purple-100 hover:text-purple-700'
                                        }`}
                                        title={
                                          content.preview_image_url
                                            ? "Image generated"
                                            : generatingImageIds.has(content.id)
                                              ? "Generating image..."
                                              : "Generate image"
                                        }
                                      >
                                        {generatingImageIds.has(content.id) ? (
                                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                                        ) : content.preview_image_url ? (
                                          <Image className="h-4 w-4 fill-purple-800" />
                                        ) : (
                                          <Image className="h-4 w-4 text-purple-600" />
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
                                      disabled={!canSendToWP(content) || (isSendingToWP && sendingToWPId === content.id)}
                                      className={`h-8 w-8 ${
                                        (content.wpSentDate || content.wpPostUrl)
                                          ? 'text-emerald-800 bg-emerald-50'
                                          : canSendToWP(content)
                                            ? 'text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700'
                                            : 'text-slate-300 cursor-not-allowed'
                                      }`}
                                      title={
                                        (content.wpSentDate || content.wpPostUrl)
                                          ? `Sent to WordPress${content.wpSentDate ? ` on ${format(new Date(content.wpSentDate), 'PPP')}` : ''}`
                                          : "Send to WordPress"
                                      }
                                    >
                                      {isSendingToWP && sendingToWPId === content.id ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                                      ) : (content.wpSentDate || content.wpPostUrl) ? (
                                        <Send className="h-4 w-4 fill-emerald-800" />
                                      ) : (
                                        <Send className="h-4 w-4" />
                                      )}
                                    </Button>

                                    {/* Generate and Publish Button */}
                                    {!(content.wpSentDate || content.wpPostUrl) && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleGenerateAndPublish(content.id);
                                        }}
                                        disabled={generatingAndPublishingIds.has(content.id)}
                                        className={`h-8 w-8 ${
                                          generatingAndPublishingIds.has(content.id)
                                            ? 'text-blue-300 cursor-not-allowed'
                                            : 'text-blue-600 hover:bg-blue-100 hover:text-blue-700'
                                        }`}
                                        title={
                                          generatingAndPublishingIds.has(content.id)
                                            ? "Generating and publishing..."
                                            : "Generate and publish content"
                                        }
                                      >
                                        {generatingAndPublishingIds.has(content.id) ? (
                                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                        ) : (
                                          <Sparkles className="h-4 w-4" />
                                        )}
                                      </Button>
                                    )}
                                    
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
          postThemeId={selectedContent.id}
          title={selectedContent.title}
          description={selectedContent.description}
          keywords={selectedContent.keywords}
          categories={selectedContent.categories}
          dateCreated={selectedContent.dateCreated}
          status={selectedContent.contentStatus || 'scheduled'}
          onClose={handleCloseContent}
          onDeleteClick={() => handleDeleteContent(selectedContent.id)}
          onRegenerateClick={() => handleRegenerateContent(selectedContent.id)}
          onGenerateImage={() => handleGenerateImage(selectedContent.id)}
          onDeleteImage={() => handleDeleteImage(selectedContent.id)}
          onSendToWordPress={() => handleSendToWordPress(selectedContent.id)}
          onGenerateAndPublish={() => handleGenerateAndPublish(selectedContent.id)}
          fullContent={selectedContent.description}
          wpSentDate={selectedContent.wpSentDate}
          wpPostUrl={selectedContent.wpPostUrl}
          preview_image_url={selectedContent.preview_image_url}
          isGeneratingContent={isThemeGeneratingContent(String(selectedContent.id))}
          isGeneratingImage={generatingImageIds.has(selectedContent.id)}
          isSendingToWP={isSendingToWP && sendingToWPId === selectedContent.id}
          isGeneratingAndPublishing={generatingAndPublishingIds.has(selectedContent.id)}
          canSendToWordPress={canSendToWP(selectedContent)}
          canGenerateImage={!!currentWebsite?.enable_ai_image_generation && !selectedContent.preview_image_url}
        />
      )}
    </SidebarProvider>
  );
};

export default ContentCalendar;

