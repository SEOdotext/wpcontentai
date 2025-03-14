import React, { useState, useEffect } from 'react';
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
import { X, Plus, Loader2, Globe, Link2Off, ArrowRight, Key, Zap } from 'lucide-react';
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

const Settings = () => {
  const { publicationFrequency, setPublicationFrequency, writingStyle, setWritingStyle, subjectMatters, setSubjectMatters, isLoading: settingsLoading } = useSettings();
  const { currentWebsite } = useWebsites();
  const { settings: wpSettings, isLoading: wpLoading, initiateWordPressAuth, completeWordPressAuth, disconnect } = useWordPress();
  const { createPostTheme } = usePostThemes();
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

  useEffect(() => {
    if (!settingsLoading) {
      setFrequency(publicationFrequency);
      setStyleInput(writingStyle);
      setSubjects(subjectMatters);
    }
  }, [settingsLoading, publicationFrequency, writingStyle, subjectMatters]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      setPublicationFrequency(frequency);
      setWritingStyle(styleInput);
      setSubjectMatters(subjects);
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
    initiateWordPressAuth(currentWebsite.url);
    setShowAuthDialog(true);
  };

  const handleCompleteWordPressAuth = async () => {
    if (!wpUsername || !wpPassword) {
      toast.error('Please enter both username and application password');
      return;
    }

    setIsAuthenticating(true);
    try {
      const success = await completeWordPressAuth(currentWebsite!.url, wpUsername, wpPassword);
      if (success) {
        setShowAuthDialog(false);
        setWpUsername('');
        setWpPassword('');
      }
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
        content = await fetchWebsiteContent(currentWebsite.url);
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
        [subject]  // Focus on this specific subject
      );
      
      // Calculate a scheduled date based on publication frequency
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + frequency);
      
      // Create post themes for each title
      const creationPromises = result.titles.map(title => 
        createPostTheme(title, result.keywords)
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
                      Connect your WordPress website to automatically publish content. We'll guide you through the process.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {wpSettings ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Connected to WordPress</p>
                            <p className="text-sm text-muted-foreground">
                              Logged in as {wpSettings.wp_username}
                            </p>
                          </div>
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
                    <CardTitle>Content Style</CardTitle>
                    <CardDescription>
                      Define the writing style and tone for your content. Be descriptive about how you want your content to sound and feel.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="writingStyle">Writing Style Guidelines</Label>
                      <Textarea 
                        id="writingStyle" 
                        value={styleInput} 
                        onChange={(e) => setStyleInput(e.target.value)}
                        placeholder="Describe how you want your content to be written..."
                        className="min-h-[150px] resize-y"
                      />
                      <p className="text-sm text-muted-foreground">
                        Tip: Be specific about tone, language style, and any particular phrases or approaches you want to use or avoid.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subject Matters</CardTitle>
                    <CardDescription>
                      Define the topics and subject areas for your content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subjectMatters">Add Subject Matters</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="subjectMatters" 
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          placeholder="Enter a subject matter"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubject();
                            }
                          }}
                        />
                        <Button onClick={handleAddSubject}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {subjects.map((subject) => (
                        <div
                          key={subject}
                          className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center gap-2"
                        >
                          {subject}
                          <button 
                            onClick={() => handleGenerateContent(subject)}
                            className="text-primary hover:text-primary-foreground ml-1"
                            disabled={generatingSubject === subject}
                            title="Generate content for this subject"
                          >
                            {generatingSubject === subject ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3" />
                            )}
                          </button>
                          <button 
                            onClick={() => handleRemoveSubject(subject)}
                            className="text-secondary-foreground/70 hover:text-secondary-foreground"
                            title="Remove subject"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button 
                    size="lg" 
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save All Settings
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Connect to WordPress</DialogTitle>
            <DialogDescription>
              Follow these steps to connect WP Content AI with your WordPress site
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Creating your Connection Key:</h4>
                <ol className="list-decimal pl-4 space-y-2 text-sm text-muted-foreground">
                  <li>In the Application Passwords section of your profile</li>
                  <li>Enter "WP Content AI" as the name</li>
                  <li>Click "Add New Application Password"</li>
                  <li>Copy the generated password - it looks like: xxxx xxxx xxxx xxxx</li>
                  <li>Paste it below along with your WordPress username</li>
                </ol>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wpUsername">WordPress Username</Label>
                <Input
                  id="wpUsername"
                  value={wpUsername}
                  onChange={(e) => setWpUsername(e.target.value)}
                  placeholder="Enter your WordPress username"
                />
                <p className="text-sm text-muted-foreground">
                  This is the username you use to log in to WordPress
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="wpPassword">Connection Key</Label>
                <Input
                  id="wpPassword"
                  type="password"
                  value={wpPassword}
                  onChange={(e) => setWpPassword(e.target.value)}
                  placeholder="Paste your connection key here"
                />
                <p className="text-sm text-muted-foreground">
                  Paste the connection key you just generated (it should look like: xxxx xxxx xxxx xxxx)
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAuthDialog(false)}
              disabled={isAuthenticating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteWordPressAuth}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Complete Connection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
};

export default Settings;
