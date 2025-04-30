import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Send, 
  Loader2, 
  RefreshCw, 
  X, 
  MessageSquare, 
  Edit2, 
  Eye,
  Globe,
  Linkedin,
  Instagram,
  Facebook,
  Video,
  Share2,
  FileEdit,
  BookOpen,
  Heart,
  MessageCircle,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { updateContentWithChat } from '@/api/chatEndpoints';
import { SocialMediaPlatformSwitcher } from './SocialMediaPlatformSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { useWebsites } from '@/context/WebsitesContext';
import { InstagramPost } from './social/InstagramPost';
import { LinkedInPost } from './social/LinkedInPost';
import { canSendToWordPress } from '@/utils/wordpress';

interface ContentEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onRegenerate: () => void;
  onSendToWordPress: () => void;
  isGeneratingContent?: boolean;
  isSendingToWP?: boolean;
  canSendToWordPress?: boolean;
  categories?: Array<{ id: string; name: string }>;
  keywords?: Array<string>;
  onUpdateContent: (newContent: string, platform?: string | null) => void;
  postThemeId?: string;
  isMainPostPublished?: boolean;
  wp_post_url?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  selectedText?: string;
  timestamp: number;
}

interface SomePost {
  id: string;
  post_theme_id: string;
  title: string;
  content: string;
  platform: string;
  status: 'pending' | 'approved' | 'published' | 'textgenerated' | 'generated' | 'declined';
  scheduled_time?: string;
  published_time?: string;
  media_urls?: string[];
  platform_post_id?: string;
  error_message?: string;
  metadata?: any;
  website_id: string;
}

interface Platform {
  key: string;
  name: string;
  icon: JSX.Element;
}

interface SomeSettings {
  id: string;
  website_id: string;
  platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook';
  is_active: boolean;
}

// Add this helper function to format social media content
const formatSocialContent = (content: string, platform: string | null) => {
  if (!content) return '';
  
  // Split content into paragraphs
  const paragraphs = content.split('\n').filter(p => p.trim());
  
  // Format based on platform
  switch (platform) {
    case 'linkedin':
      return paragraphs.map(p => {
        // Handle bullet points
        if (p.startsWith('•') || /^\d+[\.\)]/.test(p)) {
          return `<div class="my-2 ml-4">${p}</div>`;
        }
        // Handle hashtags
        if (p.includes('#')) {
          p = p.replace(/#(\w+)/g, '<span class="text-blue-600">#$1</span>');
        }
        // Handle bold text
        p = p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return `<div class="my-4">${p}</div>`;
      }).join('');
      
    case 'instagram':
    case 'facebook':
      return paragraphs.map(p => {
        // Handle emojis (preserve them)
        if (p.includes('#')) {
          p = p.replace(/#(\w+)/g, '<span class="text-blue-600">#$1</span>');
        }
        return `<div class="my-3">${p}</div>`;
      }).join('');
      
    case 'tiktok':
      return paragraphs.map(p => {
        if (p.includes('#')) {
          p = p.replace(/#(\w+)/g, '<span class="text-blue-600">#$1</span>');
        }
        return `<div class="my-2 text-lg">${p}</div>`;
      }).join('');
      
    default:
      return content;
  }
};

const InstagramPreview = ({ content }: { content: string }) => (
  <div className="instagram-container shadow-sm">
    <div className="instagram-header">
      <div className="profile-pic">
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
          <Instagram className="w-4 h-4 text-gray-600" />
        </div>
      </div>
      <div className="profile-info">
        <div className="profile-name">hirely.dk</div>
      </div>
    </div>
    
    <div
      className="instagram-content"
      dangerouslySetInnerHTML={{ 
        __html: formatSocialContent(content, 'instagram')
      }}
    />

    <div className="instagram-footer">
      <div className="instagram-actions">
        <button>
          <Heart className="w-6 h-6" />
        </button>
        <button>
          <MessageCircle className="w-6 h-6" />
        </button>
        <button>
          <Share2 className="w-6 h-6" />
        </button>
        <div className="flex-1" />
        <button>
          <Bookmark className="w-6 h-6" />
        </button>
      </div>
    </div>
  </div>
);

const ContentEditorDrawer: React.FC<ContentEditorDrawerProps> = ({
  isOpen,
  onClose,
  title,
  content,
  onRegenerate,
  onSendToWordPress,
  isGeneratingContent = false,
  isSendingToWP = false,
  canSendToWordPress: externalCanSendToWordPress = false,
  categories = [],
  keywords = [],
  onUpdateContent,
  postThemeId,
  isMainPostPublished = false,
  wp_post_url,
}) => {
  const { currentWebsite } = useWebsites();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [currentPlatform, setCurrentPlatform] = useState<string | null>(null);
  const [platformContent, setPlatformContent] = useState<Record<string, string>>({});
  const [isLoadingSocialContent, setIsLoadingSocialContent] = useState(false);
  const [activeSettings, setActiveSettings] = useState<SomeSettings[]>([]);
  const [wpConfigured, setWpConfigured] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const platforms: Platform[] = [
    { key: 'linkedin', name: 'LinkedIn', icon: <Linkedin className="h-5 w-5" /> },
    { key: 'instagram', name: 'Instagram', icon: <Instagram className="h-5 w-5" /> },
    { key: 'tiktok', name: 'TikTok', icon: <Video className="h-5 w-5" /> },
    { key: 'facebook', name: 'Facebook', icon: <Facebook className="h-5 w-5" /> }
  ];

  // Fetch active platform settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentWebsite) return;
      
      try {
        const { data, error } = await supabase
          .from('some_settings')
          .select('*')
          .eq('website_id', currentWebsite.id)
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching social media settings:', error);
        } else {
          setActiveSettings(data || []);
        }
      } catch (err) {
        console.error('Error in fetchSettings:', err);
      }
    };

    fetchSettings();
  }, [currentWebsite]);

  // Filter platforms based on active settings
  const activePlatforms = platforms.filter(platform => 
    activeSettings.some(setting => setting.platform === platform.key)
  );

  // Fetch social media content when platform changes
  useEffect(() => {
    const fetchSocialContent = async () => {
      if (!currentPlatform || !postThemeId || !currentWebsite) return;
      
      setIsLoadingSocialContent(true);
      try {
        // First check if a post exists using count
        const { count, error: countError } = await supabase
          .from('some_posts')
          .select('*', { count: 'exact', head: true })
          .eq('post_theme_id', postThemeId)
          .eq('platform', currentPlatform);

        if (countError) throw countError;

        // If no post exists, show empty state
        if (count === 0) {
          setPlatformContent(prev => ({
            ...prev,
            [currentPlatform]: ''
          }));
          setEditedContent('');
          setIsLoadingSocialContent(false);
          return;
        }

        // Only fetch the post if we know it exists
        const { data, error } = await supabase
          .from('some_posts')
          .select('*')
          .eq('post_theme_id', postThemeId)
          .eq('platform', currentPlatform)
          .single();

        if (error) throw error;

        setPlatformContent(prev => ({
          ...prev,
          [currentPlatform]: data.content
        }));
        setEditedContent(data.content);
      } catch (err) {
        console.error('Error fetching social media content:', err);
        // Don't show error toast for non-existent posts
        if (err.code !== 'PGRST116') {
          toast.error('Failed to load social media content');
        }
        // Set empty content on error
        setPlatformContent(prev => ({
          ...prev,
          [currentPlatform]: ''
        }));
        setEditedContent('');
      } finally {
        setIsLoadingSocialContent(false);
      }
    };

    if (currentPlatform === null) {
      setEditedContent(content);
    } else {
      fetchSocialContent();
    }
  }, [currentPlatform, postThemeId, content, currentWebsite]);

  // Add useEffect to fetch WordPress settings
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
          setWpConfigured(true);
        }
      } catch (e) {
        console.error('Exception checking WordPress settings:', e);
      }
    };
    
    fetchWordPressSettings();
  }, [currentWebsite]);

  // Add function to generate social content
  const handleGenerateSocialContent = async () => {
    if (!currentPlatform || !postThemeId || !currentWebsite) return;

    setIsLoadingSocialContent(true);
    try {
      // First, ensure the post exists
      const { data: existingPost, error: checkError } = await supabase
        .from('some_posts')
        .select('*')
        .eq('post_theme_id', postThemeId)
        .eq('platform', currentPlatform)
        .maybeSingle();

      if (checkError) throw checkError;

      // If post doesn't exist, create it
      if (!existingPost) {
        const { error: createError } = await supabase
          .from('some_posts')
          .insert([{
            post_theme_id: postThemeId,
            website_id: currentWebsite.id,
            platform: currentPlatform,
            title: title,
            content: '',
            status: 'pending'
          }]);

        if (createError) throw createError;
      }

      // Now generate the content
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        'https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-social-content',
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            post_theme_id: postThemeId,
            platform: currentPlatform,
            website_id: currentWebsite.id
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate content');
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to generate content');

      // Refresh the content after generation
      const { data: updatedPost, error: fetchError } = await supabase
        .from('some_posts')
        .select('*')
        .eq('post_theme_id', postThemeId)
        .eq('platform', currentPlatform)
        .single();

      if (fetchError) throw fetchError;

      setPlatformContent(prev => ({
        ...prev,
        [currentPlatform]: updatedPost.content
      }));
      setEditedContent(updatedPost.content);
      
      toast.success('Content generated successfully');
    } catch (err) {
      console.error('Error generating social content:', err);
      toast.error('Failed to generate content');
    } finally {
      setIsLoadingSocialContent(false);
    }
  };

  // Handle platform change
  const handlePlatformChange = async (platform: string | null) => {
    // Save current edits before switching
    if (isEditing && currentPlatform !== platform) {
      await handleSaveEdit();
    }
    setCurrentPlatform(platform);
  };

  const handleSaveEdit = async () => {
    try {
      if (currentPlatform === null) {
        onUpdateContent(editedContent, null);
      } else {
        // Update some_posts table
        const { error } = await supabase
          .from('some_posts')
          .upsert({
            post_theme_id: postThemeId,
            platform: currentPlatform,
            title: title,
            content: editedContent,
            status: 'pending'
          });

        if (error) throw error;

        setPlatformContent(prev => ({
          ...prev,
          [currentPlatform]: editedContent
        }));
        onUpdateContent(editedContent, currentPlatform);
      }
    setIsEditing(false);
    toast.success('Content saved successfully');
    } catch (err) {
      console.error('Error saving content:', err);
      toast.error('Failed to save content');
    }
  };

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);
      // Auto-fill the chat input with the selected text
      setUserInput(`Rewrite this part: "${text}"`);
    } else {
      setSelectedText('');
    }
  };

  const addMessage = (message: Omit<ChatMessage, 'timestamp'>) => {
    setChatMessages(prev => [...prev, { ...message, timestamp: Date.now() }]);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing || !postThemeId) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: userInput.trim(),
      selectedText: selectedText || undefined,
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setSelectedText('');
    setIsProcessing(true);

    try {
      // Add a processing message
      addMessage({
        role: 'assistant',
        content: 'Processing your request...',
      });

      // Get platform settings if on a social platform
      let platformSettings = null;
      if (currentPlatform) {
        const { data } = await supabase
          .from('some_settings')
          .select('*')
          .eq('website_id', currentWebsite?.id)
          .eq('platform', currentPlatform)
          .single();
        platformSettings = data;
      }

      const response = await updateContentWithChat(postThemeId, {
        userMessage: userInput,
        selectedText,
        platform: currentPlatform,
        platformSettings // Pass platform settings to the chat function
      });
      
      // Remove the processing message
      setChatMessages(prev => prev.slice(0, -1));
      
      if (response.success && response.updatedContent) {
        onUpdateContent(response.updatedContent, currentPlatform);
        
        // Add assistant's response to chat with contextual message
        const userMessage = userInput.toLowerCase();
        let responseMessage = '';
        
        if (userMessage.includes('generate')) {
          responseMessage = 'I\'ve generated new content optimized for ' + (currentPlatform || 'your website') + '. You can see it in the preview.';
        } else if (userMessage.includes('rewrite')) {
          responseMessage = 'I\'ve rewritten the content to better match your requirements and platform guidelines.';
        } else {
          responseMessage = 'I\'ve updated the content based on your request. The changes are now visible in the preview.';
        }

        addMessage({
          role: 'assistant',
          content: responseMessage,
        });

        toast.success('Content updated successfully');
      } else {
        throw new Error(response.message || 'Failed to update content');
      }
    } catch (error) {
      console.error('Error processing chat message:', error);
      setChatMessages(prev => prev.slice(0, -1));
      addMessage({
        role: 'error',
        content: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
      });
      toast.error('Failed to process your request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPlatformIcon = (platform: string | null) => {
    switch (platform) {
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'facebook':
        return <Facebook className="h-4 w-4" />;
      case 'tiktok':
        return <Video className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  // Add a memoized function to check WordPress availability
  const canSendToWP = useCallback((postId: string, postUrl: string | undefined, content: string) => {
    return canSendToWordPress({
      id: postId,
      wp_post_url: postUrl,
      content: content
    }, wpConfigured, isSendingToWP);
  }, [wpConfigured, isSendingToWP]);

  const getPlatformActions = (platform: string | null) => {
    const actions = [];

    // Edit button is always available
    actions.push(
      <Button
        key="edit"
        variant="ghost"
        size="icon"
        onClick={() => setIsEditing(!isEditing)}
        title={isEditing ? "Preview" : "Edit"}
      >
        {isEditing ? (
          <BookOpen className="h-4 w-4" />
        ) : (
          <Edit2 className="h-4 w-4" />
        )}
      </Button>
    );

    // Generate/Regenerate content button
    if (platform === null) {
      // For website content
      if (content) {
        // Show regenerate only if content exists
        actions.push(
          <Button
            key="regenerate"
            variant="ghost"
            size="icon"
            onClick={onRegenerate}
            disabled={isGeneratingContent}
            title="Regenerate website content"
          >
            {isGeneratingContent ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        );
      } else {
        // Show generate for empty website content
        actions.push(
          <Button
            key="generate"
            variant="ghost"
            size="icon"
            onClick={onRegenerate}
            disabled={isGeneratingContent}
            title="Generate website content"
          >
            <FileEdit className="h-4 w-4" />
          </Button>
        );
      }
    } else {
      // For social media content
      if (editedContent) {
        // Show regenerate for existing social content
        actions.push(
          <Button
            key="regenerate"
            variant="ghost"
            size="icon"
            onClick={handleGenerateSocialContent}
            disabled={isLoadingSocialContent}
            title={`Regenerate ${platform} content`}
          >
            {isLoadingSocialContent ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        );
      } else {
        // Show generate for empty social content
        actions.push(
          <Button
            key="generate"
            variant="ghost"
            size="icon"
            onClick={handleGenerateSocialContent}
            disabled={isLoadingSocialContent}
            title={`Generate ${platform} content`}
          >
            <FileEdit className="h-4 w-4" />
          </Button>
        );
      }
    }

    // Platform-specific actions
    if (platform === null && content) {
      // WordPress publish button for main website content (only if content exists)
      actions.push(
        <Button
          key="wordpress"
          variant="ghost"
          size="icon"
          onClick={onSendToWordPress}
          disabled={!externalCanSendToWordPress || isSendingToWP}
          title="Publish to WordPress"
        >
          {isSendingToWP ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      );
    } else if (editedContent) {
      // Social media share button (only show if content exists)
      actions.push(
        <Button
          key="share"
          variant="ghost"
          size="icon"
          onClick={() => toast.info('Social media sharing coming soon')}
          title={`Share on ${platform}`}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      );
    }

    // Close button is always last
    actions.push(
      <Button
        key="close"
        variant="ghost"
        size="icon"
        onClick={onClose}
        title="Close"
      >
        <X className="h-4 w-4" />
      </Button>
    );

    return actions;
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-[95%] max-w-6xl bg-background border-l shadow-lg transform transition-transform duration-300 ease-in-out z-50',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Platform Selection */}
            <div className="w-[60px] border-r flex flex-col items-center py-4 bg-muted/10">
              <div className="flex flex-col items-center space-y-2 w-full">
                {/* Website Icon */}
                <div className="w-full flex justify-center">
                  <Button
                    variant={currentPlatform === null ? "default" : "ghost"}
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handlePlatformChange(null)}
                    title="Website Content"
                  >
                    <Globe className="h-5 w-5" />
                  </Button>
                </div>

                {/* Social Platform Icons */}
                {activePlatforms.map(platform => (
                  <div key={platform.key} className="w-full flex justify-center">
                    <Button
                      variant={currentPlatform === platform.key ? "default" : "ghost"}
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => handlePlatformChange(platform.key)}
                      title={platform.name}
                    >
                      {platform.icon}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {/* Platform-specific Header */}
              <div className="border-b bg-muted/5 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getPlatformIcon(currentPlatform)}
                  <span className="font-medium">
                    {currentPlatform === null ? 'Website Content' : 
                      activePlatforms.find(p => p.key === currentPlatform)?.name || ''}
                  </span>
                  {isLoadingSocialContent && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getPlatformActions(currentPlatform)}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex overflow-hidden">
                {/* Editor/Preview */}
                <div className="w-[70%] p-4 overflow-auto">
                  {currentPlatform && !editedContent ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <p className="text-muted-foreground mb-4">No content generated yet for {currentPlatform}</p>
                      <Button 
                        onClick={handleGenerateSocialContent}
                        disabled={isLoadingSocialContent}
                        size="lg"
                      >
                        {isLoadingSocialContent ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Generate {currentPlatform} Content
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      {currentPlatform && !wp_post_url && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-700">
                                Note: Social media posts can only include links to the article once it is published.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
              {isEditing ? (
                <div className="h-full flex flex-col">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="flex-1 min-h-[500px] font-mono text-sm"
                  />
                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleSaveEdit}>Save Changes</Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                          <div className="p-4">
                            {currentPlatform === 'instagram' ? (
                              <div className="bg-white">
                                <InstagramPost content={editedContent} />
                              </div>
                            ) : currentPlatform === 'linkedin' ? (
                              <div className="bg-white">
                                <LinkedInPost 
                                  content={editedContent} 
                                  websiteUrl={currentWebsite?.url}
                                  websiteName={currentWebsite?.name}
                                />
                              </div>
                            ) : (
                  <div
                    ref={contentRef}
                                className={cn(
                                  "prose max-w-none select-text",
                                  currentPlatform && "social-content",
                                  currentPlatform === 'tiktok' && "tiktok-content",
                                  currentPlatform === 'facebook' && "facebook-content"
                                )}
                                dangerouslySetInnerHTML={{ 
                                  __html: currentPlatform ? formatSocialContent(editedContent, currentPlatform) : editedContent 
                                }}
                    onMouseUp={handleTextSelection}
                    onKeyUp={handleTextSelection}
                  />
                            )}
                          </div>
                </ScrollArea>
                      )}
                    </div>
              )}
            </div>

            {/* Chat Interface */}
                <div className="w-[30%] border-l flex flex-col">
              <div className="flex-1 overflow-hidden">
                <div 
                  ref={chatContainerRef} 
                  className="h-full p-4 overflow-y-auto"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {chatMessages.map((message, index) => (
                    <div
                      key={`${message.timestamp}-${index}`}
                      className={cn(
                        'mb-4 p-3 rounded-lg',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto max-w-[90%]'
                          : message.role === 'error'
                          ? 'bg-destructive/10 text-destructive max-w-[90%]'
                          : 'bg-muted max-w-[90%]'
                      )}
                    >
                      {message.selectedText && (
                        <div className="mb-2 p-2 bg-primary/20 rounded text-sm">
                          <span className="font-medium">Selected text:</span>
                          <p className="mt-1 italic">{message.selectedText}</p>
                        </div>
                      )}
                      {message.content}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedText ? "Type your message about the selected text..." : "Type your message here..."}
                    className="flex-1 min-h-[120px] resize-y"
                    rows={5}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!userInput.trim() || isProcessing || !postThemeId}
                    className="self-end"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category.id}
                  className="px-2 py-1 text-xs rounded-full bg-muted"
                >
                  {category.name}
                </span>
              ))}
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs rounded-full bg-muted"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContentEditorDrawer; 