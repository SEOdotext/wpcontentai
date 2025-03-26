import React, { useState, useEffect, FormEvent } from 'react';
import AppSidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from "@/components/ui/sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSettings } from '@/context/SettingsContext';
import { useWebsites } from '@/context/WebsitesContext';
import { useWordPress } from '@/context/WordPressContext';
import { usePostThemes } from '@/context/PostThemesContext';
import { toast } from 'sonner';
import { X, Plus, Loader2, Globe, Link2Off, ArrowRight, Key, Zap, Link, HelpCircle, Pencil, Sparkles, RefreshCw, Wand2, Trash2, Upload } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { languages } from '@/data/languages';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Configuration
const SUPABASE_FUNCTIONS_URL = 'https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1';
const WORDPRESS_PROXY_URL = `${SUPABASE_FUNCTIONS_URL}/wordpress-proxy`;

// WordPress settings interface
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
  last_post_at?: string;
}

// Add a constant for the clean template at the top of the file
const CLEAN_WORDPRESS_TEMPLATE = `<article class="post">
  <header class="entry-header">
    <h1 class="entry-title">Post Title Goes Here</h1>
    <div class="entry-meta">
      <span class="posted-on">Posted on <time class="entry-date">Date</time></span>
      <span class="byline">by <span class="author">Author</span></span>
    </div>
  </header>
  <div class="entry-content">
    <!-- Content will be inserted here -->
  </div>
  <footer class="entry-footer">
    <span class="cat-links">Posted in Categories</span>
    <span class="tags-links">Tagged with Tags</span>
  </footer>
</article>`;

// Add default WordPress template constant
const defaultWordPressTemplate = `<!-- WordPress Post HTML Structure Example -->
<article class="post">

  <div class="entry-content">
    <p>First paragraph of the post with an <a href="#">example link</a> goes here.</p>
    
    <h2>First Subheading</h2>
    <p>Content under the first subheading with <strong>bold text</strong> and <em>italic text</em>.</p>
    
    <h3>Secondary Subheading</h3>
    <p>More detailed content explaining the topic.</p>
    
    <ul>
      <li>First bullet point</li>
      <li>Second bullet point</li>
      <li>Third bullet point with <a href="#">link</a></li>
    </ul>
    
    <h2>Second Main Subheading</h2>
    <p>Opening paragraph for this section introducing the next points.</p>
    
    <ol>
      <li>First numbered item</li>
      <li>Second numbered item</li>
      <li>Third numbered item</li>
    </ol>
    
    <blockquote>
      <p>This is an example of a blockquote that might contain a testimonial or important quote related to the content.</p>
    </blockquote>
    
    <h2>Conclusion</h2>
    <p>Summary paragraph that wraps up the post and may include a call to action.</p>
  </div>

</article>`;

interface Category {
  id: string;
  website_id: string;
  wp_category_id: number;
  name: string;
  slug: string;
  description: string;
  parent_id: number;
  count: number;
  created_at: string;
  updated_at: string;
}

const Settings = () => {
  const { publicationFrequency, setPublicationFrequency, writingStyle, setWritingStyle, subjectMatters, setSubjectMatters, wordpressTemplate, setWordpressTemplate, isLoading: settingsLoading, imagePrompt, setImagePrompt } = useSettings();
  const { currentWebsite, updateWebsite } = useWebsites();
  const { settings: wpSettings, isLoading: wpLoading, initiateWordPressAuth, completeWordPressAuth, disconnect } = useWordPress();
  const { addPostTheme } = usePostThemes();
  const [frequency, setFrequency] = useState(publicationFrequency);
  const [styleInput, setStyleInput] = useState(writingStyle);
  const [subjects, setSubjects] = useState<string[]>(subjectMatters);
  const [newSubject, setNewSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [wpUrl, setWpUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpPassword, setWpPassword] = useState('');
  const [generatingSubject, setGeneratingSubject] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionDiagnostics, setConnectionDiagnostics] = useState<any>(null);
  const [directWpSettings, setDirectWpSettings] = useState<WordPressSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wpFormatOpen, setWpFormatOpen] = useState(false);
  const [htmlTemplate, setHtmlTemplate] = useState(wordpressTemplate);
  const [sendingTestPost, setSendingTestPost] = useState(false);
  const [testPostId, setTestPostId] = useState<number | null>(null);
  const [testPostUrl, setTestPostUrl] = useState<string | null>(null);
  // Add state for website language
  const [websiteLanguage, setWebsiteLanguage] = useState<string>(currentWebsite?.language || 'en');
  const [customLanguageModalOpen, setCustomLanguageModalOpen] = useState(false);
  const [customLanguageInput, setCustomLanguageInput] = useState("");
  const [wpPublishStatus, setWpPublishStatus] = useState<string>('draft');
  // Add new state for category generation
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [generatedCategories, setGeneratedCategories] = useState<{ name: string; slug: string }[]>([]);
  const [isGeneratingCategories, setIsGeneratingCategories] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Add direct fetch from database when dialog opens
  useEffect(() => {
    const fetchWpSettingsDirectly = async () => {
      if (showAuthDialog && currentWebsite) {
        console.log('Dialog opened, fetching WordPress settings directly from the database');
        
        try {
          console.log('Making direct Supabase call to fetch WordPress settings');
          // Note: We're making a direct call to Supabase here, ignoring type errors
          const response = await (supabase as any)
            .from('wordpress_settings')
            .select('*')
            .eq('website_id', currentWebsite.id)
            .single();
          
          if (response.data) {
            console.log('Directly fetched settings from database:', response.data);
            setDirectWpSettings(response.data);
            setWpUsername(response.data.wp_username || '');
            setWpPassword(response.data.wp_application_password || '');
            console.log('Set fields from direct database query:', {
              username: response.data.wp_username,
              passwordLength: response.data.wp_application_password?.length || 0
            });
          } else if (response.error) {
            console.error('Error fetching WordPress settings:', response.error);
          } else {
            console.log('No WordPress settings found for this website');
          }
        } catch (error) {
          console.error('Error fetching WordPress settings:', error);
        }
      }
    };
    
    fetchWpSettingsDirectly();
  }, [showAuthDialog, currentWebsite]);

  // The existing useEffect for dialog open state
  useEffect(() => {
    console.log('Dialog open state changed:', showAuthDialog);
    console.log('WordPress settings from context:', wpSettings);
    
    if (showAuthDialog && wpSettings) {
      console.log('Dialog opened with existing settings, trying to populate fields:', {
        username: wpSettings.wp_username,
        passwordLength: wpSettings.wp_application_password?.length || 0
      });
      
      // Set a small timeout to ensure React has fully rendered the dialog
      setTimeout(() => {
        setWpUsername(wpSettings.wp_username || '');
        setWpPassword(wpSettings.wp_application_password || '');
        console.log('Fields should now be populated');
      }, 50);
    }
  }, [showAuthDialog, wpSettings]);

  useEffect(() => {
    if (!settingsLoading) {
      setFrequency(publicationFrequency);
      setStyleInput(writingStyle);
      setSubjects(subjectMatters);
      
      // Use the template from context instead of overriding it
      setHtmlTemplate(wordpressTemplate);
      console.log('Using WordPress template from context:', wordpressTemplate.substring(0, 50) + '...');
    }
  }, [settingsLoading, publicationFrequency, writingStyle, subjectMatters, wordpressTemplate]);

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
          
          // Set publish status if it exists
          if (data[0]?.publish_status) {
            setWpPublishStatus(data[0].publish_status);
          }
        }
      } catch (e) {
        console.error('Exception checking WordPress settings:', e);
      }
    };
    
    fetchWordPressSettings();
  }, [currentWebsite]);

  // Replace with the original useEffect for getting the current website ID
  useEffect(() => {
    if (currentWebsite) {
      console.log('Current website ID:', currentWebsite.id);
      console.log('Checking WordPress settings...');
      
      // Direct check in the database
      const checkWpSettings = async () => {
        try {
          // @ts-ignore - Ignore TypeScript errors for wordpress_settings table access
          const { data, error } = await supabase
            .from('wordpress_settings')
            .select('*')
            .eq('website_id', currentWebsite.id)
            .single();
            
          if (error) {
            console.error('Error checking WordPress settings:', error);
            setDirectWpSettings(null);
          } else {
            console.log('WordPress settings found directly in DB:', data);
            console.log('WordPress connection state:', data?.is_connected);
            
            // Store the WordPress settings directly in state
            setDirectWpSettings(data);
            
            // Set publish status if it exists
            if (data?.publish_status) {
              setWpPublishStatus(data.publish_status);
            }
          }
        } catch (e) {
          console.error('Exception checking WordPress settings:', e);
          setDirectWpSettings(null);
        }
      };
      
      checkWpSettings();
    }
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
    
    console.log('=== End WordPress Integration Status Debug ===');
  }, [wpSettings, directWpSettings, currentWebsite]);

  // Explicitly log WordPress settings from context when they change
  useEffect(() => {
    console.log('WordPress settings from context changed:', wpSettings);
  }, [wpSettings]);

  // Add a useEffect to reset htmlTemplate to a clean version when component mounts
  useEffect(() => {
    // Set a clean WordPress template without title, author, date, categories
    const cleanTemplate = `<div class="entry-content">
    <!-- Content will be inserted here -->
  </div>`;
    
    // Only set if the current template has the entry-title in it
    if (htmlTemplate && (htmlTemplate.includes('entry-title') || htmlTemplate.includes('Post Title Goes Here'))) {
      console.log('Setting clean WordPress template without title/author/date elements');
      // Log the template being used to verify it matches user's expectations
      console.log('Using default WordPress template:', defaultWordPressTemplate.substring(0, 50) + '...');
      setHtmlTemplate(defaultWordPressTemplate);
      
      // Also save to context if we're initializing with a problematic template
      if (!settingsLoading && wordpressTemplate && wordpressTemplate.includes('entry-title')) {
        setWordpressTemplate(defaultWordPressTemplate);
      }
    }
  }, [htmlTemplate, wordpressTemplate, settingsLoading]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      setPublicationFrequency(frequency);
      setWritingStyle(styleInput);
      setSubjectMatters(subjects);
      // Also save the HTML template here if needed
      // You would typically save it to your backend or context
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects([...subjects, newSubject.trim()]);
      setNewSubject('');
    }
  };

  const handleRemoveSubject = (subject: string) => {
    setSubjects(subjects.filter(s => s !== subject));
  };

  const handleStartWordPressAuth = () => {
    if (!currentWebsite?.url) {
      toast.error('Please enter your WordPress website URL first');
      return;
    }
    
    // Clear any previous errors when starting a new connection attempt
    setConnectionError(null);
    setConnectionDiagnostics(null);
    
    initiateWordPressAuth(currentWebsite.url);
    setShowAuthDialog(true);
  };

  const handleCompleteWordPressAuth = async () => {
    // Field validations
    if (!wpUsername.trim()) {
      setConnectionError('WordPress username is required');
      return;
    }

    if (!wpPassword.trim()) {
      setConnectionError('WordPress password is required');
      return;
    }

    if (!currentWebsite) {
      toast.error('No website selected. Please select a website first');
      console.log('Error: No website selected for WordPress authentication');
      return;
    }

    // Clear previous error states when starting authentication
    setConnectionError(null);
    setConnectionDiagnostics(null);
    setIsAuthenticating(true);
    try {
      // Clean and validate the URL
      let url = currentWebsite.url.trim();
      
      // Make sure the URL is properly formatted
      if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url;
        console.log('URL adjusted to include protocol:', url);
      }
      
      // Remove any trailing slashes
      url = url.replace(/\/+$/, '');
      
      console.log('Attempting direct WordPress auth for website:', url);

      // Try direct connection with basic auth credentials
      // Use a URL that's known to work (WordPress.org) to store our credentials directly
      console.log('Trying direct WordPress authentication...');
      
      // Create credentials for saving to database
      const wpSettings = {
        website_id: currentWebsite.id,
        wp_url: url,
        wp_username: wpUsername,
        wp_application_password: wpPassword,
        is_connected: true,
        updated_at: new Date().toISOString()
      };
      
      // Save to database without testing (trust user input)
      console.log('Saving WordPress settings directly to database');
      try {
        // Check if there's already a record for this website
        const { data: existingSettings, error: fetchError } = await supabase
          .from('wordpress_settings')
          .select('*')
          .eq('website_id', currentWebsite.id)
          .single();
          
        if (fetchError && fetchError.code !== 'PGRST116') {
          // Real error (not "no rows returned" error)
          console.error('Error checking for existing settings:', fetchError);
          toast.error('Failed to check for existing WordPress settings');
          setConnectionError('Database error: ' + fetchError.message);
          return;
        }
        
        let result;
        if (existingSettings) {
          // Update existing record
          console.log('Updating existing WordPress settings');
          result = await supabase
            .from('wordpress_settings')
            .update(wpSettings)
            .eq('website_id', currentWebsite.id)
            .select()
            .single();
        } else {
          // Insert new record
          console.log('Inserting new WordPress settings');
          result = await supabase
            .from('wordpress_settings')
            .insert(wpSettings)
            .select()
            .single();
        }
        
        const { data, error } = result;
          
        if (error) {
          console.error('Database error:', error);
          toast.error('Failed to save WordPress settings');
          setConnectionError('Database error: ' + error.message);
          return;
        }
        
        setShowAuthDialog(false);
        setWpUsername('');
        setWpPassword('');
        toast.success('WordPress connection saved successfully');
        console.log('WordPress settings saved to database');
        
        // Offer to test the connection right after saving
        const testConnection = window.confirm('WordPress connection saved. Would you like to test the connection now?');
        if (testConnection) {
          // Test the connection
          try {
            console.log(`Testing WordPress connection to: ${url}`);
            
            // Show notice about development environment
            if (window.location.hostname === 'localhost') {
              toast.info("Note: Connection tests may return detailed errors to help with troubleshooting", {
                duration: 6000, // Show for 6 seconds
              });
            }
            
            // Use our direct test function with the Edge Function
            if (wpSettings && wpSettings.wp_username && wpSettings.wp_application_password) {
              await testEdgeFunction(
                wpSettings.wp_url,
                wpSettings.wp_username,
                wpSettings.wp_application_password
              );
            } else {
              toast.error("WordPress credentials not found");
            }
          } catch (testError) {
            console.error("Connection test error:", testError);
            toast.error(`Connection test failed: ${testError instanceof Error ? testError.message : String(testError)}`);
            
            // Still show a positive message
            toast.info(`Your WordPress connection details are saved and may work for publishing even if testing fails.`);
          }
        }
      } catch (dbError) {
        console.error('Database operation error:', dbError);
        toast.error('Error saving WordPress settings to the database');
        setConnectionError('Database error: ' + (dbError instanceof Error ? dbError.message : String(dbError)));
      }
    } catch (error) {
      console.error('Error during WordPress authentication:', error);
      toast.error('Failed to connect to WordPress. Please check your credentials and URL.');
      setConnectionError('Authentication error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnectWordPress = async () => {
    if (await disconnect()) {
      setWpUrl('');
      setWpUsername('');
      setWpPassword('');
    }
  };

  const handleGenerateContent = async (subject: string) => {
    if (!currentWebsite) {
      toast.error('Please select a website first');
      return;
    }
    
    setGeneratingSubject(subject);
    try {
      // Import the AI service endpoints
      const { fetchWebsiteContent } = await import('@/api/aiEndpoints');
      const { generateTitleSuggestions } = await import('@/services/aiService');
      
      // Fetch website content
      let content;
      try {
        content = await fetchWebsiteContent(currentWebsite.url, currentWebsite.id);
        console.log(`Fetched website content for ${currentWebsite.url} (${content.length} characters)`);
      } catch (error) {
        console.error('Error fetching website content:', error);
        toast.error('Failed to fetch website content');
        return;
      }
      
      // Generate title suggestions using AI
      const result = await generateTitleSuggestions(
        content,
        [subject], // Use the subject as the main keyword
        styleInput, // Use the current writing style
        [subject],  // Focus on this specific subject
        currentWebsite?.id || ''
      );
      
      // Calculate a scheduled date based on publication frequency
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + frequency);
      
      // Create post themes for each title
      const creationPromises = result.titles.map(title => 
        addPostTheme({
          website_id: currentWebsite?.id || '',
          subject_matter: title,
          keywords: result.keywords,
          status: 'pending',
          scheduled_date: scheduledDate.toISOString(),
          post_content: null,
          image: null,
          wp_post_id: null,
          wp_post_url: null,
          wp_sent_date: null
        })
      );
      
      await Promise.all(creationPromises);
      
      toast.success(`${result.titles.length} content ideas for "${subject}" have been scheduled for ${scheduledDate.toLocaleDateString()}`);
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error(`Failed to schedule content for "${subject}"`);
    } finally {
      setGeneratingSubject(null);
    }
  };
  
  // Helper function to generate keywords for a subject (fallback if AI service fails)
  const generateKeywordsForSubject = (subject: string): string[] => {
    // In a real implementation, you might use an AI service to generate relevant keywords
    // For now, we'll just create some placeholder keywords based on the subject
    const baseKeywords = ['guide', 'tips', 'best practices', 'how to', 'introduction'];
    return baseKeywords.map(keyword => `${subject} ${keyword}`);
  };

  // Improve button click to explicitly log and confirm credentials being loaded
  const openAuthDialogWithCredentials = () => {
    // Clear any previous errors when starting a new connection attempt
    setConnectionError(null);
    setConnectionDiagnostics(null);
    
    // Use either direct settings or context settings
    const settings = directWpSettings || wpSettings;
    
    if (settings) {
      console.log('Setting credentials before opening dialog:', {
        username: settings.wp_username,
        passwordLength: settings.wp_application_password?.length || 0
      });
      
      // First set credentials, then open dialog
      setWpUsername(settings.wp_username || '');
      setWpPassword(settings.wp_application_password || '');
      
      // Open dialog
      setShowAuthDialog(true);
      
      // Double check with timeout to ensure state is updated
      setTimeout(() => {
        if (!wpUsername || !wpPassword) {
          console.log('Credentials not set correctly, retrying with timeout');
          setWpUsername(settings.wp_username || '');
          setWpPassword(settings.wp_application_password || '');
        }
      }, 100);
    } else {
      // For new connections, clear credentials and start WordPress auth
      setWpUsername('');
      setWpPassword('');
      setShowAuthDialog(true);
      handleStartWordPressAuth();
    }
  };

  const testEdgeFunction = async (wpUrl: string, wpUsername: string, wpPassword: string) => {
    console.log(`Testing Edge Function: ${WORDPRESS_PROXY_URL}`);
    console.log(`Using credentials - Username: ${wpUsername}, Password length: ${wpPassword.length}`);
    
    // Check password format - WordPress application passwords typically have spaces
    if (wpPassword.length > 10 && !wpPassword.includes(' ')) {
      console.warn('Password does not contain spaces - WordPress application passwords typically have format "xxxx xxxx xxxx xxxx"');
      toast.warning('Your WordPress password may be in incorrect format. Application passwords should include spaces.', {
        duration: 8000
      });
    } else if (wpPassword.length < 24) {
      console.warn('Password length seems short for WordPress application password');
      toast.warning('Your password seems shorter than typical WordPress application passwords.', {
        duration: 5000
      });
    }
    
    // Get current session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Prepare headers based on authentication status
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (sessionData?.session?.access_token) {
      console.log('Adding authentication to Edge Function request');
      headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
    } else {
      console.log('No authentication token available for Edge Function request');
      toast.error('You must be logged in to test WordPress connections');
      return false;
    }
    
    // Try multiple URL formats if main connection fails
    const cleanUrl = wpUrl.replace(/\/+$/, '');
    const urlVariations = [
      cleanUrl,                                                 // Original URL without trailing slashes
      cleanUrl.replace(/^https?:\/\//i, ''),                    // Without protocol
      cleanUrl.toLowerCase(),                                   // Lowercase version
      `https://${cleanUrl.replace(/^https?:\/\//i, '')}`,       // Force HTTPS
    ];
    
    console.log('Will try the following URL variations if needed:', urlVariations);
    
    // First try with the cleaned URL
    console.log(`Using WordPress URL: ${urlVariations[0]}`);
    
    try {
      // Log the exact data we're sending
      const requestPayload = {
        wpUrl: urlVariations[0],
        username: wpUsername,
        password: wpPassword, // Send password as-is, preserving any spaces
      };
      console.log('Sending payload to Edge Function:', {
        ...requestPayload,
        password: requestPayload.password.replace(/[^\s]/g, 'x') // Log masked password
      });
      
      // Send request to Edge Function
      const response = await fetch(WORDPRESS_PROXY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
      });
      
      console.log(`Edge Function response status: ${response.status} ${response.statusText}`);
      
      try {
        const responseData = await response.json();
        console.log("Full response from Edge Function:", responseData);
        
        if (responseData.success) {
          toast.success("WordPress connection successful!");
          
          // Update the connection status in the database
          if (wpSettings && currentWebsite) {
            try {
              console.log("Updating connection status in WordPress settings");
              
              // Log current WordPress settings
              console.log("Current WordPress settings:", {
                id: wpSettings.id,
                website_id: wpSettings.website_id,
                is_connected: wpSettings.is_connected,
                updated_at: wpSettings.updated_at
              });
              
              // @ts-ignore - Ignore TypeScript errors for wordpress_settings table access
              const { error } = await supabase
                .from('wordpress_settings')
                .update({ 
                  updated_at: new Date().toISOString(),
                  is_connected: true
                })
                .eq('website_id', currentWebsite.id);
                
              if (error) {
                console.error("Error updating connection status:", error);
                console.error("Database error details:", {
                  code: error.code,
                  message: error.message,
                  details: error.details,
                  hint: error.hint
                });
              } else {
                console.log("Successfully updated connection status");
                
                // Try to fetch and log the updated settings
                try {
                  // @ts-ignore
                  const { data: updatedSettings, error: fetchError } = await supabase
                    .from('wordpress_settings')
                    .select('*')
                    .eq('website_id', currentWebsite.id)
                    .single();
                    
                  if (fetchError) {
                    console.error("Failed to fetch updated settings:", fetchError);
                  } else {
                    console.log("Updated WordPress settings:", {
                      is_connected: updatedSettings.is_connected,
                      updated_at: updatedSettings.updated_at
                    });
                  }
                } catch (fetchErr) {
                  console.error("Exception in fetching updated settings:", fetchErr);
                }
                
                // Refresh the page to show updated data
                toast.info("Connection status updated. Refreshing page...");
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              }
            } catch (updateError) {
              console.error("Exception updating connection status:", updateError);
            }
          }
          return true;
        } else {
          // Get specific error information
          const errorMsg = responseData.error || 'Unknown error';
          const statusCode = responseData.statusCode || response.status;
          
          console.error(`WordPress connection failed (${statusCode}): ${errorMsg}`);
          
          // Show a more user-friendly error message based on status code
          if (statusCode === 401) {
            toast.error(`Authentication failed: Invalid WordPress username or application password`);
          } else if (statusCode === 404) {
            toast.error(`WordPress API not found: Check if the REST API is enabled on your site`);
          } else {
            toast.error(`WordPress connection failed: ${errorMsg}`);
          }
          
          // If we have settings but test failed, mark as not connected
          if (wpSettings && currentWebsite) {
            try {
              console.log("Updating connection status to false after failed test");
              
              // @ts-ignore - Ignore TypeScript errors for wordpress_settings table access
              const { error: updateError } = await supabase
                .from('wordpress_settings')
                .update({ 
                  is_connected: false,
                  updated_at: new Date().toISOString()
                })
                .eq('website_id', currentWebsite.id);
                
              if (updateError) {
                console.error("Error updating connection status:", updateError);
              } else {
                console.log("Successfully marked WordPress connection as inactive");
                toast.info("The connection has been marked as inactive.");
              }
            } catch (updateError) {
              console.error("Error updating connection status:", updateError);
            }
          }
          
          return false;
        }
      } catch (parseError) {
        console.error("Could not parse Edge Function response", parseError);
        toast.error(`Could not parse Edge Function response: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (edgeError) {
      console.error("Edge Function error:", edgeError);
      toast.error(`Edge Function error: ${edgeError instanceof Error ? edgeError.message : String(edgeError)}`);
      return false;
    }
  };

  /**
   * Checks if WordPress is fully connected with all required properties
   * @returns {boolean} True if WordPress is connected and has valid credentials
   */
  const isWordPressConnected = () => {
    // Log WordPress settings for debugging
    console.log('Checking WordPress connection status with settings:', wpSettings ? {
      has_settings: !!wpSettings,
      has_url: !!wpSettings?.wp_url,
      has_username: !!wpSettings?.wp_username,
      has_password: !!(wpSettings?.wp_application_password?.length > 0),
      is_connected_flag: wpSettings?.is_connected,
      id: wpSettings?.id,
      website_id: wpSettings?.website_id
    } : 'No settings found');
    
    // The actual check
    const isConnected = !!(
      wpSettings && 
      wpSettings.wp_url && 
      wpSettings.wp_username && 
      wpSettings.wp_application_password &&
      wpSettings.is_connected
    );
    
    console.log('WordPress connection result:', isConnected);
    return isConnected;
  };

  /**
   * Renders the WordPress connection additional information when connected
   * Shows last interaction with API without replacing the existing UI
   */
  const renderConnectionStatusInfo = () => {
    if (!wpSettings) return null;
    
    return (
      <div className="mt-4 border rounded-md p-4 bg-muted/30 space-y-3">
        <h4 className="text-sm font-medium">Connection Status Information</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Last connection test:</span>
              <span className="text-xs font-medium">
                {(directWpSettings?.updated_at || wpSettings?.updated_at) ? 
                  new Date(directWpSettings?.updated_at || wpSettings?.updated_at).toLocaleString() : 
                  'Unknown'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">First connected on:</span>
              <span className="text-xs font-medium">
                {(directWpSettings?.created_at || wpSettings?.created_at) ? 
                  new Date(directWpSettings?.created_at || wpSettings?.created_at).toLocaleString() : 
                  'Unknown'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">API endpoint:</span>
              <code className="text-xs bg-muted p-1 rounded">
                {(directWpSettings?.wp_url || wpSettings?.wp_url) ? 
                  `${directWpSettings?.wp_url || wpSettings?.wp_url}/wp-json/wp/v2/` : 
                  'Not configured'}
              </code>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Authentication:</span>
              <span className="text-xs font-medium">Application Password</span>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          <strong>Tip:</strong> If you experience connection issues, check that your WordPress REST API is enabled and your site is accessible.
        </div>
      </div>
    );
  };

  // Debug function to directly check the database
  const debugCheckWordPressSettings = async () => {
    if (!currentWebsite) {
      toast.error('No website selected');
      return;
    }

    console.log('Directly checking WordPress settings in database...');
    console.log('Current website ID:', currentWebsite.id);

    try {
      // @ts-ignore - Ignore TypeScript errors for wordpress_settings table access
      const { data, error } = await supabase
        .from('wordpress_settings')
        .select('*')
        .eq('website_id', currentWebsite.id);

      if (error) {
        console.error('Error fetching WordPress settings from DB:', error);
        toast.error('Failed to check WordPress settings in database');
      } else if (data && data.length > 0) {
        console.log('WordPress settings found in database:', data);
        console.log('WordPress connection state:', data[0].is_connected);
        toast.success('Found WordPress settings in database - check console');
      } else {
        console.log('No WordPress settings found in database');
        toast.info('No WordPress settings found in database');
      }
    } catch (e) {
      console.error('Exception checking WordPress settings:', e);
      toast.error('Error checking WordPress settings');
    }
  };

  // Clean up the handleSaveTemplate function
  const handleSaveTemplate = () => {
    try {
      // Save the current template from the editor
      console.log('Saving WordPress template from editor');
      
      // Save template to context which will persist to database
      setWordpressTemplate(htmlTemplate);
      toast.success("WordPress template saved successfully");
      
    } catch (error) {
      console.error('Error saving WordPress HTML template:', error);
      toast.error("Failed to save WordPress template. Please try again.");
    }
  };

  // Helper function to get WordPress admin edit URL for a post
  const getWordPressEditUrl = (postId: number): string => {
    if (!wpSettings?.wp_url && !directWpSettings?.wp_url) {
      console.log('No WordPress URL available in settings:', { 
        wpSettings: wpSettings?.wp_url,
        directWpSettings: directWpSettings?.wp_url 
      });
      return '#';
    }
    
    // Use either direct settings or context settings
    const baseUrl = wpSettings?.wp_url || directWpSettings?.wp_url || '';
    console.log('Base URL from settings:', baseUrl);
    
    // Make sure URL is properly formatted
    let formattedUrl = baseUrl;
    if (!formattedUrl.startsWith('http')) {
      formattedUrl = 'https://' + formattedUrl;
      console.log('Added https protocol:', formattedUrl);
    }
    formattedUrl = formattedUrl.replace(/\/+$/, ''); // Remove trailing slashes
    console.log('Formatted URL after removing trailing slashes:', formattedUrl);
    
    // Log the constructed URL for debugging
    const adminUrl = `${formattedUrl}/wp-admin/post.php?post=${postId}&action=edit`;
    console.log('WordPress Admin URL constructed:', adminUrl);
    
    return adminUrl;
  };

  // Function to check if test post arrived in WordPress
  const checkTestPost = () => {
    if (!testPostId) {
      toast.error('No test post has been sent yet');
      return;
    }
    
    // Get the admin URL
    const adminUrl = getWordPressEditUrl(testPostId);
    if (adminUrl === '#') {
      toast.error('WordPress URL is missing');
      return;
    }
    
    // Open WordPress admin edit page in new tab
    console.log('Opening WordPress admin URL:', adminUrl);
    window.open(adminUrl, '_blank');
    
    toast.info('Opening WordPress post editor. You should see your test post if it was received.');
  };

  // Function to handle sending a test post to WordPress
  const handleSendTestPost = async () => {
    if (!currentWebsite) {
      toast.error('Please select a website first');
      return;
    }

    setSendingTestPost(true);
    try {
      console.log('Sending test post to WordPress...');
      
      // Get current session for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.access_token) {
        toast.error('You must be logged in to send test posts');
        setSendingTestPost(false);
        return;
      }

      // Prepare headers with authentication
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`
      };
      
      // Create test post content using the existing posts endpoint
      const testPost = {
        title: `Test Post from WP Content AI - ${new Date().toLocaleTimeString()}`,
        content: `
          <h2>This is a test post from WP Content AI</h2>
          <p>This post was automatically generated on ${new Date().toLocaleString()} to verify your WordPress connection is working correctly.</p>
          <p>If you can see this post in your WordPress admin, your connection is properly configured!</p>
          <p>You can safely delete this post after verification.</p>
        `,
        status: 'draft', // Send as draft to avoid publishing test content
        website_id: currentWebsite.id,
        action: 'create' // Required parameter for the wordpress-posts function
      };
      
      // Send request to existing Edge Function
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/wordpress-posts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPost),
      });
      
      console.log(`Test post response status: ${response.status} ${response.statusText}`);
      
      const responseData = await response.json();
      console.log("Response from test post:", responseData);
      
      if (responseData.success) {
        // Get the post ID
        const postId = responseData.post.id;
        
        // Save the post ID 
        setTestPostId(postId);
        
        // Generate and store the WordPress admin edit URL
        const adminUrl = getWordPressEditUrl(postId);
        setTestPostUrl(adminUrl);
        console.log('Test post created, admin URL:', adminUrl);
        
        // Show toast with admin edit link
        toast.success(
          <div>
            Test post sent successfully! <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">Edit in WordPress</a>
          </div>,
          {
            duration: 8000, // Show for longer to give time to click the link
          }
        );
      } else {
        console.error('Failed to send test post:', responseData.error);
        toast.error(`Failed to send test post: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending test post:', error);
      toast.error(`Error sending test post: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSendingTestPost(false);
    }
  };

  // Update the handleOpenWpFormat function to use the template from context
  const handleOpenWpFormat = () => {
    setWpFormatOpen(!wpFormatOpen);
    
    if (!wpFormatOpen) {
      // When opening the editor, use the current template from context
      console.log('Setting editor to current WordPress template from context');
      setHtmlTemplate(wordpressTemplate);
    }
  };

  // Add function to handle restoring the default template
  const handleRestoreDefaultTemplate = () => {
    // Set the template back to default
    setHtmlTemplate(defaultWordPressTemplate);
    toast.info("Default WordPress template restored");
  };

  // Handle language change
  const handleLanguageChange = async (language: string) => {
    if (!currentWebsite) {
      toast.error("Please select a website first");
      return;
    }

    // If they selected "other", show the modal for custom language code
    if (language === 'other') {
      setCustomLanguageInput(""); // Clear previous input
      setCustomLanguageModalOpen(true);
      return;
    }

    setWebsiteLanguage(language);
    
    try {
      // Update website language in database
      const success = await updateWebsite(currentWebsite.id, { language });
      if (success) {
        const languageName = languages.find(l => l.code === language)?.name || language;
        toast.success(`Website language updated to ${languageName}`);
      }
    } catch (error) {
      console.error('Failed to update website language:', error);
      toast.error('Failed to update website language');
    }
  };

  // Handle custom language submission
  const handleCustomLanguageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!customLanguageInput.trim()) {
      toast.error("Please enter a language code");
      return;
    }
    
    // Use the custom code, trimmed and lowercased
    const customCode = customLanguageInput.trim().toLowerCase();
    
    // Close modal
    setCustomLanguageModalOpen(false);
    
    // Apply the custom language
    setWebsiteLanguage(customCode);
    
    try {
      // Update website language in database
      const success = await updateWebsite(currentWebsite!.id, { language: customCode });
      if (success) {
        toast.success(`Website language updated to custom code: ${customCode}`);
      }
    } catch (error) {
      console.error('Failed to update website language:', error);
      toast.error('Failed to update website language');
    }
  };
  
  // Function to open the custom language modal for existing custom language
  const handleEditCustomLanguage = () => {
    setCustomLanguageInput(websiteLanguage);
    setCustomLanguageModalOpen(true);
  };

  // Add a function to display the current language name
  const getCurrentLanguageName = (): string => {
    const language = languages.find(l => l.code === websiteLanguage);
    if (language) return language.name;
    return websiteLanguage; // If it's a custom language code, display the code itself
  };

  // Effect to sync language state with current website
  useEffect(() => {
    if (currentWebsite?.language) {
      setWebsiteLanguage(currentWebsite.language);
    } else {
      setWebsiteLanguage('en'); // Default to English
    }
  }, [currentWebsite]);

  // Update WordPress publish status
  const updateWordPressPublishStatus = async (status: string) => {
    if (!currentWebsite) {
      toast.error('No website selected');
      return;
    }

    setWpPublishStatus(status);
    
    try {
      console.log('Updating WordPress publish status to:', status);
      
      // @ts-ignore - Ignore TypeScript errors for wordpress_settings table access
      const { error } = await supabase
        .from('wordpress_settings')
        .update({ 
          publish_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('website_id', currentWebsite.id);
        
      if (error) {
        console.error('Error updating WordPress publish status:', error);
        toast.error('Failed to update WordPress publish status');
        return;
      }
      
      toast.success('WordPress publish status updated successfully');
    } catch (e) {
      console.error('Exception updating WordPress publish status:', e);
      toast.error('Failed to update WordPress publish status');
    }
  };

  // Add function to generate category ideas
  const generateCategoryIdeas = async () => {
    if (!currentWebsite) {
      toast.error('Please select a website first');
      return;
    }

    setIsGeneratingCategories(true);
    try {
      console.log('Generating category ideas for website:', currentWebsite.id);
      
      // Get existing categories to exclude them
      const existingCategories = categories.map(c => c.name.toLowerCase());
      console.log('Existing categories:', existingCategories);

      const response = await fetch('https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/generate-category-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          websiteId: currentWebsite.id,
          existingCategories // Pass existing categories to exclude
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Error generating categories:', error);
        throw new Error(error);
      }

      const data = await response.json();
      console.log('Generated categories:', data);

      // Filter out any categories that already exist
      const newCategories = data.categories.filter((category: { name: string; slug: string }) => 
        !existingCategories.includes(category.name.toLowerCase())
      );

      if (newCategories.length === 0) {
        toast.info('No new category ideas generated. All suggested categories already exist.');
        return;
      }

      setGeneratedCategories(newCategories);
      setShowCategoryDialog(true);
      toast.success('Category ideas generated successfully');
    } catch (error) {
      console.error('Error generating categories:', error);
      toast.error('Failed to generate category ideas');
    } finally {
      setIsGeneratingCategories(false);
    }
  };

  // Add function to handle category deletion
  const handleDeleteCategory = async (category: Category) => {
    if (!currentWebsite) {
      toast.error('Please select a website first');
      return;
    }

    try {
      console.log('Deleting category:', category);
      
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/manage-local-categories`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          websiteId: currentWebsite.id,
          categoryId: category.wp_category_id
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Error deleting category:', error);
        throw new Error(error);
      }

      // Update local state
      setCategories(categories.filter(c => c.wp_category_id !== category.wp_category_id));
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleWordPressConnect = async () => {
    setIsConnecting(true);
    try {
      handleStartWordPressAuth();
    } catch (error) {
      console.error('Error connecting to WordPress:', error);
      toast.error('Failed to connect to WordPress');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleWordPressDisconnect = async () => {
    setIsConnecting(true);
    try {
      handleDisconnectWordPress();
    } catch (error) {
      console.error('Error disconnecting from WordPress:', error);
      toast.error('Failed to disconnect from WordPress');
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePublishStatusChange = async (value: string) => {
    setIsConnecting(true);
    try {
      updateWordPressPublishStatus(value);
    } catch (error) {
      console.error('Error updating publish status:', error);
      toast.error('Failed to update publish status');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshCategories = async () => {
    setIsGeneratingCategories(true);
    try {
      await generateCategoryIdeas();
    } catch (error) {
      console.error('Error refreshing categories:', error);
      toast.error('Failed to refresh categories');
    } finally {
      setIsGeneratingCategories(false);
    }
  };

  // Add function to fetch categories
  const fetchCategories = async () => {
    if (!currentWebsite) {
      console.log('No website selected, skipping category fetch');
      return;
    }

    try {
      console.log('Fetching categories for website:', currentWebsite.id);
      const { data: categories, error } = await supabase
        .from('wordpress_categories')
        .select('*')
        .eq('website_id', currentWebsite.id)
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to fetch categories');
        return;
      }

      console.log('Fetched categories:', categories);
      setCategories(categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  // Add useEffect to fetch categories when currentWebsite changes
  useEffect(() => {
    if (currentWebsite) {
      console.log('Current website changed, fetching categories');
      fetchCategories();
    }
  }, [currentWebsite]);

  // Add function to handle adding a category
  const addCategory = async (category: { name: string; slug: string }) => {
    if (!currentWebsite) {
      toast.error('Please select a website first');
      return;
    }

    try {
      console.log('Adding category:', category);
      
      // Generate a random ID between 1 and 1000000 for wp_category_id
      const wp_category_id = Math.floor(Math.random() * 1000000) + 1;
      
      // Insert the category into the database
      const { error } = await supabase
        .from('wordpress_categories')
        .insert({
          website_id: currentWebsite.id,
          wp_category_id,
          name: category.name,
          slug: category.slug,
          description: '', // Optional description
          parent_id: 0, // No parent category
          count: 0 // No posts yet
        });

      if (error) {
        console.error('Error adding category:', error);
        throw error;
      }

      // Refresh the categories list
      await fetchCategories();
      
      // Show success message but keep modal open
      toast.success(`Category "${category.name}" added successfully`);
      
      // Remove the added category from the generated list
      setGeneratedCategories(prev => prev.filter(c => c.name !== category.name));
      
      // If no more categories to add, close the modal
      if (generatedCategories.length === 1) {
        setShowCategoryDialog(false);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  // Add function to fetch categories from WordPress
  const fetchCategoriesFromWordPress = async () => {
    if (!currentWebsite) {
      toast.error('Please select a website first');
      return;
    }

    setIsGeneratingCategories(true);
    try {
      console.log('Fetching categories from WordPress for website:', currentWebsite.id);
      
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/wordpress-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          websiteId: currentWebsite.id,
          action: 'fetch'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Error fetching categories from WordPress:', error);
        throw new Error(error);
      }

      const data = await response.json();
      console.log('Categories fetched from WordPress:', data);

      // Refresh the local categories list
      await fetchCategories();
      
      toast.success('Categories refreshed from WordPress');
    } catch (error) {
      console.error('Error fetching categories from WordPress:', error);
      toast.error('Failed to fetch categories from WordPress');
    } finally {
      setIsGeneratingCategories(false);
    }
  };

  // Add function to push categories to WordPress
  const pushCategoriesToWordPress = async () => {
    if (!currentWebsite) {
      toast.error('Please select a website first');
      return;
    }

    setIsGeneratingCategories(true);
    try {
      console.log('Pushing categories to WordPress for website:', currentWebsite.id);
      
      // Get all categories for this website
      const { data: categories, error: categoriesError } = await supabase
        .from('wordpress_categories')
        .select('*')
        .eq('website_id', currentWebsite.id);

      if (categoriesError) {
        throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
      }

      if (!categories || categories.length === 0) {
        toast.info('No categories to push to WordPress');
        return;
      }

      // Get current session for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.access_token) {
        toast.error('You must be logged in to push categories');
        return;
      }

      // Push categories using the new edge function
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/push-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          websiteId: currentWebsite.id,
          categories: categories.map(cat => ({
            name: cat.name,
            slug: cat.slug,
            description: cat.description || ''
          }))
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Error pushing categories to WordPress:', error);
        throw new Error(error);
      }

      const data = await response.json();
      console.log('Push categories response:', data);

      // Check results
      const successful = data.results.filter((r: any) => r.success).length;
      const failed = data.results.filter((r: any) => !r.success).length;

      if (failed > 0) {
        toast.warning(`Pushed ${successful} categories, ${failed} failed`);
        console.error('Failed categories:', data.results.filter((r: any) => !r.success));
      } else {
        toast.success(`Successfully pushed ${successful} categories to WordPress`);
      }

      // Refresh the categories list
      await fetchCategories();
    } catch (error) {
      console.error('Error pushing categories to WordPress:', error);
      toast.error('Failed to push categories to WordPress');
    } finally {
      setIsGeneratingCategories(false);
    }
  };

  // Update the categories display section
  const renderCategoriesSection = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Categories</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCategoriesFromWordPress}
            disabled={isGeneratingCategories}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGeneratingCategories ? 'animate-spin' : ''}`} />
            Get Categories from WordPress
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={pushCategoriesToWordPress}
            disabled={isGeneratingCategories}
          >
            <Upload className={`h-4 w-4 mr-2 ${isGeneratingCategories ? 'animate-spin' : ''}`} />
            Push to WordPress
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateCategoryIdeas}
            disabled={isGeneratingCategories}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Generate Ideas
          </Button>
        </div>
      </div>
      
      {categories.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No categories found. Generate some ideas to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.wp_category_id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div>
                <h4 className="font-medium">{category.name}</h4>
                <p className="text-sm text-muted-foreground">URL: {category.slug}</p>
                {category.description && (
                  <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteCategory(category)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6 max-w-6xl mx-auto">
            {currentWebsite && (
              <Alert className="bg-muted/50 border-muted">
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  Managing settings for <strong>{currentWebsite.name}</strong>
                </AlertDescription>
              </Alert>
            )}
            
            {settingsLoading || wpLoading ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>WordPress Integration</CardTitle>
                    <CardDescription>
                      {(wpSettings?.is_connected || directWpSettings?.is_connected) ? 
                        "Manage your WordPress connection and view recent activity." : 
                        "Connect your WordPress website to automatically publish content. We'll guide you through the process."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(wpSettings?.is_connected || directWpSettings?.is_connected) ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center">
                              <div className={`h-2 w-2 rounded-full mr-2 bg-green-500`}></div>
                              <p className="font-medium">Connected to WordPress</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Logged in as {directWpSettings?.wp_username || wpSettings?.wp_username}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                // Open dialog with existing credentials
                                openAuthDialogWithCredentials();
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Manage Connection
                            </Button>
                            
                            {/* Check connection button */}
                            <Button
                              variant="outline"
                              onClick={refreshWordPressSettings}
                            >
                              <span className="h-4 w-4 mr-2">🔄</span>
                              Check Connection
                            </Button>
                            
                            {/* Test Post Button */}
                            <Button
                              variant="outline"
                              onClick={handleSendTestPost}
                              disabled={sendingTestPost}
                            >
                              {sendingTestPost ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4 mr-2" />
                                  Send Test Post
                                </>
                              )}
                            </Button>
                            
                            <Button
                              variant="outline"
                              onClick={handleDisconnectWordPress}
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                            >
                              <Link2Off className="h-4 w-4 mr-2" />
                              Disconnect
                            </Button>
                          </div>
                        </div>
                        
                        {/* Add WordPress Publish Status selector */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="publish-status"
                              checked={wpPublishStatus === 'publish'}
                              onCheckedChange={(checked) => updateWordPressPublishStatus(checked ? 'publish' : 'draft')}
                            />
                            <Label htmlFor="publish-status">
                              Published
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Choose whether content should be saved as draft or published immediately when sent to WordPress.
                          </p>
                        </div>
                        
                        {renderCategoriesSection()}
                        
                        {/* Test Post Feedback - Show only when a test post has been created */}
                        {testPostId && (
                          <div className="mt-4 border border-green-200 rounded-md p-4 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                                  <Zap className="h-4 w-4 text-green-600 dark:text-green-300" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Test Post Sent Successfully</h3>
                                <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                                  <p>Post ID: {testPostId}</p>
                                  {testPostUrl && testPostUrl !== '#' && (
                                    <p className="mt-1">
                                      <a 
                                        href={testPostUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-green-600 dark:text-green-300 underline hover:text-green-800 dark:hover:text-green-200"
                                        onClick={(e) => {
                                          // Log click and URL for debugging
                                          console.log('Clicked WordPress admin link:', testPostUrl);
                                        }}
                                      >
                                        Edit in WordPress
                                      </a>
                                    </p>
                                  )}
                                  <p className="mt-2">
                                    This draft post is only visible in your WordPress admin area.
                                  </p>
                                </div>
                                <div className="mt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={checkTestPost}
                                    className="text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800/30 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-800/50"
                                  >
                                    <ArrowRight className="h-3 w-3 mr-2" />
                                    Open in WordPress
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Render additional connection status information */}
                        {renderConnectionStatusInfo()}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="rounded-lg border bg-card p-4">
                          <h4 className="font-medium mb-2">Before you start:</h4>
                          <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                            <li>Make sure you're logged into your WordPress admin</li>
                            <li>You'll create a secure connection key that only WP Content AI can use</li>
                            <li>This is more secure than using your admin password</li>
                          </ul>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Create a Secure Connection</Label>
                            <Button 
                              variant="outline" 
                              className="w-full justify-start"
                              onClick={() => {
                                if (!currentWebsite?.url) {
                                  toast.error('Website URL is not configured');
                                  return;
                                }
                                // Remove protocol if present and add https
                                const cleanUrl = currentWebsite.url.replace(/^https?:\/\//, '');
                                // Check if URL ends with /wp-admin or similar
                                const baseUrl = cleanUrl.replace(/\/(wp-admin|wp-login|wp-content).*$/, '');
                                window.open(`https://${baseUrl}/wp-admin/profile.php#application-passwords-section`, '_blank');
                                handleStartWordPressAuth();
                              }}
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Generate Connection Key
                            </Button>
                            <p className="text-sm text-muted-foreground">
                              We'll open your WordPress profile where you can create a secure connection key
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              className="w-full"
                              onClick={() => {
                                openAuthDialogWithCredentials();
                              }}
                            >
                              <Link className="h-4 w-4 mr-2" />
                              Connect & Test
                            </Button>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon">
                                    <HelpCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-80">
                                  <p>Connect to your WordPress site and test the connection immediately.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                            <p className="text-sm font-medium">What is a Connection Key?</p>
                            <p className="text-sm text-muted-foreground">
                              A connection key (or application password) is a secure way to let WP Content AI connect to your WordPress site. 
                              Unlike your admin password, it has limited access and can be revoked at any time.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Publication Settings</CardTitle>
                    <CardDescription>
                      Configure how often content should be scheduled for publication
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Publication Frequency (days between posts)</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="frequency" 
                          type="number" 
                          min="1" 
                          max="90" 
                          value={frequency} 
                          onChange={(e) => setFrequency(parseInt(e.target.value || "7", 10))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Keyword Management</CardTitle>
                    <CardDescription>
                      Configure default keywords and tags for your content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Default Keywords</Label>
                      <div className="flex flex-wrap gap-2">
                        {subjects.map((subject, index) => (
                          <Badge 
                            key={index}
                            variant="outline" 
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {subject}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 rounded-full p-0 ml-1 text-blue-700 hover:bg-blue-200 hover:text-blue-800"
                              onClick={() => handleRemoveSubject(subject)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Add a new keyword"
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubject();
                            }
                          }}
                        />
                        <Button onClick={handleAddSubject}>
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* WordPress HTML Template Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>WordPress HTML Template</CardTitle>
                    <CardDescription>
                      Customize the HTML structure used for generated WordPress content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="wpTemplate">Content Structure</Label>
                        <div className="space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleOpenWpFormat}
                          >
                            {wpFormatOpen ? "Close Editor" : "Edit Template"}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleRestoreDefaultTemplate}
                            disabled={!wpFormatOpen}
                          >
                            Restore Default
                          </Button>
                        </div>
                      </div>
                      
                      {wpFormatOpen ? (
                        <div className="mt-2 border rounded-md p-3 bg-muted/30">
                          <p className="text-sm mb-2">Edit the HTML template that will be used for WordPress posts:</p>
                          <Textarea
                            id="wpTemplate"
                            value={htmlTemplate}
                            onChange={(e) => setHtmlTemplate(e.target.value)}
                            className="font-mono h-60 text-sm"
                          />
                          <div className="mt-3 flex justify-end">
                            <Button 
                              size="sm"
                              onClick={handleSaveTemplate}
                            >
                              Save Template
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 border rounded-md p-3 bg-muted/30">
                          <p className="text-sm text-muted-foreground mb-2">Current WordPress post structure:</p>
                          <div className="font-mono text-xs p-3 bg-muted rounded border overflow-auto max-h-32">
                            <pre className="whitespace-pre-wrap break-all text-muted-foreground">{htmlTemplate}</pre>
                          </div>
                          <p className="text-xs text-muted-foreground mt-3">
                            Click "Edit Template" to customize how content is structured in WordPress
                          </p>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        This template defines the HTML structure of posts sent to WordPress. Your content will be inserted where <code>{'<!-- Content will be inserted here -->'}</code> appears.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Website Language</CardTitle>
                    <CardDescription>
                      Set the primary language for your website content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="language">Content Language</Label>
                      <div className="flex gap-2">
                        <select
                          id="language"
                          value={languages.some(l => l.code === websiteLanguage) ? websiteLanguage : 'other'}
                          onChange={(e) => handleLanguageChange(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {languages.map(lang => (
                            <option key={lang.code} value={lang.code}>
                              {lang.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {!languages.some(l => l.code === websiteLanguage) && (
                        <div className="mt-2 p-3 border rounded-md bg-muted/30">
                          <p>Using custom language code: <span className="font-medium">{websiteLanguage}</span></p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="mt-2 h-8 text-xs"
                            onClick={handleEditCustomLanguage}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit Custom Language Code
                          </Button>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        This affects how content is generated, including capitalization rules for headings and language-specific formatting.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>AI Image Generation</CardTitle>
                    <CardDescription>
                      Configure AI-powered image generation for your posts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable AI Image Generation</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically generate preview images for your posts using AI
                          </p>
                        </div>
                        <Switch
                          checked={currentWebsite?.enable_ai_image_generation || false}
                          onCheckedChange={async (checked) => {
                            if (!currentWebsite) {
                              toast.error("Please select a website first");
                              return;
                            }
                            try {
                              const success = await updateWebsite(currentWebsite.id, {
                                enable_ai_image_generation: checked
                              });
                              if (success) {
                                toast.success(checked ? "AI image generation enabled" : "AI image generation disabled");
                              }
                            } catch (error) {
                              console.error('Failed to update AI image generation setting:', error);
                              toast.error('Failed to update AI image generation setting');
                            }
                          }}
                        />
                      </div>

                      {currentWebsite?.enable_ai_image_generation && (
                        <div className="space-y-2 mt-4">
                          <Label htmlFor="image-prompt">
                            Image Generation Prompt
                            <span className="block text-sm text-muted-foreground">
                              Customize how images are generated. Use {'{title}'} for the content title and {'{content}'} for the content description.
                            </span>
                          </Label>
                          <Input
                            id="image-prompt"
                            type="text"
                            defaultValue={imagePrompt}
                            onBlur={async (e) => {
                              try {
                                setImagePrompt(e.target.value);
                                toast.success("Image generation prompt updated");
                              } catch (error) {
                                console.error('Failed to update image prompt:', error);
                                toast.error('Failed to update image prompt');
                              }
                            }}
                            placeholder="Create a modern, professional image that represents: {title}. Context: {content}"
                          />
                          <p className="text-xs text-muted-foreground">
                            Example: "Create a photorealistic {'{title}'} in the style of {'{content}'}"
                          </p>
                        </div>
                      )}

                      <div className="rounded-lg border bg-muted/30 p-4">
                        <h4 className="font-medium mb-2">About AI Image Generation:</h4>
                        <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                          <li>Generates unique preview images for each post</li>
                          <li>Uses post content to create relevant images</li>
                          <li>Images are automatically optimized for your website</li>
                          <li>Requires valid content to generate images</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-4">
                  <Button
                    variant="default"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* WordPress Authentication Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto" onEscapeKeyDown={(e) => {
          if (isAuthenticating) {
            e.preventDefault();
          }
        }}>
          <DialogHeader>
            <DialogTitle>{wpSettings ? 'Edit WordPress Connection' : 'Connect to WordPress'}</DialogTitle>
            <DialogDescription>
              {wpSettings 
                ? 'Update your WordPress credentials' 
                : 'Enter your WordPress credentials to connect your site'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
              e.preventDefault();
              console.log('Form submitted via submit event');
              if (!wpUsername || !wpPassword) {
                toast.error('Please enter both username and application password');
                console.log('Validation failed: missing username or password');
                return;
              }
              handleCompleteWordPressAuth();
            }}>
            <div className="space-y-6 py-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Creating your Connection Key:</h4>
                  <ol className="list-decimal pl-4 space-y-2 text-sm text-muted-foreground">
                    <li>In your WordPress admin, go to <b>Users → Profile</b></li>
                    <li>Scroll down to <b>Application Passwords</b> section</li>
                    <li>Enter "WP Content AI" as the name</li>
                    <li>Click <b>Add New Application Password</b></li>
                    <li>Copy the generated password <b>exactly as shown</b> - it should look like: xxxx xxxx xxxx xxxx</li>
                    <li>Paste it below along with your WordPress username</li>
                  </ol>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wpUsername">WordPress Username</Label>
                  <Input
                    id="wpUsername"
                    name="wpUsername"
                    value={wpUsername}
                    onChange={(e) => {
                      console.log('Username input changed:', e.target.value);
                      setWpUsername(e.target.value);
                    }}
                    placeholder="Enter your WordPress username"
                    autoComplete="username"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    This is the username you use to log in to WordPress
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="wpPassword">Connection Key</Label>
                  <Input
                    id="wpPassword"
                    name="wpPassword"
                    type="text" 
                    className="font-mono"
                    value={wpPassword}
                    onChange={(e) => {
                      // Preserve the exact format including spaces which are critical
                      console.log('Password input changed (length):', e.target.value.length);
                      setWpPassword(e.target.value);
                    }}
                    placeholder="xxxx xxxx xxxx xxxx"
                    autoComplete="off"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Paste the connection key <b>exactly as shown</b>, including all spaces. It should look like <code>xxxx xxxx xxxx xxxx</code>.
                  </p>
                  {wpPassword && !wpPassword.includes(' ') && (
                    <div className="text-xs text-red-600 mt-2 p-2 border border-red-300 bg-red-50 rounded">
                      <p className="font-medium">Important: Missing spaces in your connection key</p>
                      <p className="mt-1">WordPress application passwords normally include spaces between each 4-character group</p>
                      <p className="mt-1">Copy the entire password directly from WordPress and paste it without modifications.</p>
                    </div>
                  )}
                  {wpPassword && wpPassword.length > 40 && (
                    <div className="text-xs text-amber-600 mt-2 p-2 border border-amber-300 bg-amber-50 rounded">
                      <p className="font-medium">Warning: Unusually long password</p>
                      <p className="mt-1">Your password is {wpPassword.length} characters long, which is unusual for a WordPress application password.</p>
                      <p className="mt-1">Most WordPress application passwords are between 24-32 characters with spaces.</p>
                    </div>
                  )}
                </div>

                {isAuthenticating && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm mb-4">
                    <p className="font-medium flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting to WordPress...
                    </p>
                    <p className="text-muted-foreground mt-1">
                      This is happening in our secure cloud function and may take a few moments
                    </p>
                  </div>
                )}

                {currentWebsite?.url && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                    <p className="font-medium">Connecting to: <span className="text-blue-600">{currentWebsite.url}</span></p>
                    <p className="text-muted-foreground mt-1">Make sure this URL matches your WordPress site and is accessible</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      <strong>Expected format:</strong> example.com or www.example.com (we'll add https:// automatically)
                    </p>
                  </div>
                )}
                
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm">
                  <p className="font-medium text-yellow-800">Important Note:</p>
                  <p className="text-yellow-800 mt-1">
                    Your WordPress credentials will be stored in our database but <strong>NOT</strong> verified immediately.
                  </p>
                  <p className="text-yellow-800 mt-1">
                    Make sure you enter the correct information to ensure content publishing works later.
                  </p>
                  <p className="text-yellow-800 mt-1">
                    <strong>For local development:</strong> Connection testing will likely fail due to authentication and CORS restrictions. 
                    This is expected and does not mean your credentials are invalid.
                  </p>
                </div>
                
                {connectionError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                    <p className="font-medium text-red-700">Connection Error:</p>
                    <p className="text-red-700 mt-1">{connectionError}</p>
                    
                    {connectionDiagnostics && (
                      <div className="mt-3">
                        <details className="text-xs">
                          <summary className="cursor-pointer font-medium text-gray-600">Technical Details (for troubleshooting)</summary>
                          <div className="mt-2 p-2 bg-white/50 rounded-sm border border-gray-200 font-mono">
                            <p><strong>URL Tested:</strong> {connectionDiagnostics.urlTested}</p>
                            <p><strong>Status:</strong> {connectionDiagnostics.statusCode} {connectionDiagnostics.statusText}</p>
                          </div>
                        </details>
                      </div>
                    )}
                    
                    <div className="mt-3 text-xs text-gray-700">
                      <p className="font-medium">Common solutions:</p>
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li>Make sure your WordPress site is publicly accessible</li>
                        <li>Ensure the REST API is enabled in WordPress</li>
                        <li>Check that your application password was copied correctly (including spaces)</li>
                        <li>Try using your WordPress admin username instead of your email address</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isAuthenticating) {
                    setShowAuthDialog(false);
                    console.log('Connection modal closed by user');
                  }
                }}
                disabled={isAuthenticating}
                type="button"
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Complete Connection button clicked');
                  handleCompleteWordPressAuth();
                }}
                disabled={!wpUsername || !wpPassword || isAuthenticating}
                type="submit"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Connection'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Language Input Modal */}
      <Dialog open={customLanguageModalOpen} onOpenChange={setCustomLanguageModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCustomLanguageSubmit}>
            <DialogHeader>
              <DialogTitle>Custom Language Code</DialogTitle>
              <DialogDescription>
                Enter a valid ISO language code (e.g., 'is' for Icelandic, 'uk' for Ukrainian).
                <a 
                  href="https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline ml-1"
                >
                  View ISO 639-1 codes
                </a>
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Input
                id="customLanguage"
                className="w-full"
                placeholder="Enter language code (e.g., is, uk)"
                value={customLanguageInput}
                onChange={(e) => setCustomLanguageInput(e.target.value)}
                autoFocus
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCustomLanguageModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Language</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generated Category Ideas Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generated Category Ideas</DialogTitle>
            <DialogDescription>
              Here are some category ideas based on your content. Click to add them to your WordPress site.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {generatedCategories.map((category, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => addCategory(category)}
              >
                <div>
                  <h4 className="font-medium">{category.name}</h4>
                  <p className="text-sm text-muted-foreground">{category.slug}</p>
                </div>
                <Button variant="ghost" size="sm">
                  Add
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
};

export default Settings;
