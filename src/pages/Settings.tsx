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
import { toast } from 'sonner';
import { X, Plus, Loader2, Globe, Link2Off, ArrowRight, Key } from 'lucide-react';
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

const Settings = () => {
  const { publicationFrequency, setPublicationFrequency, writingStyle, setWritingStyle, subjectMatters, setSubjectMatters, isLoading: settingsLoading } = useSettings();
  const { currentWebsite } = useWebsites();
  const { settings: wpSettings, isLoading: wpLoading, initiateWordPressAuth, completeWordPressAuth, disconnect } = useWordPress();
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
                            <li>Make sure you have admin access to your WordPress site</li>
                            <li>You'll need to create a secure connection for WP Content AI</li>
                            <li>We'll guide you through each step of the process</li>
                          </ul>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Step 1: Access WordPress Admin</Label>
                            <Button 
                              variant="outline" 
                              className="w-full justify-start" 
                              onClick={() => window.open(`${currentWebsite?.url}/wp-admin/user-new.php`, '_blank')}
                            >
                              <Globe className="h-4 w-4 mr-2" />
                              Open WordPress Admin
                            </Button>
                            <p className="text-sm text-muted-foreground">
                              First, create a new WordPress user for WP Content AI (if you haven't already)
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Step 2: Create Application Password</Label>
                            <Button 
                              variant="outline" 
                              className="w-full justify-start"
                              onClick={handleStartWordPressAuth}
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Generate Application Password
                            </Button>
                            <p className="text-sm text-muted-foreground">
                              We'll help you create a secure connection key for WP Content AI
                            </p>
                          </div>

                          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                            <p className="text-sm font-medium">Need help?</p>
                            <p className="text-sm text-muted-foreground">
                              Check out our guide on {" "}
                              <Button 
                                variant="link" 
                                className="h-auto p-0 text-sm"
                                onClick={() => window.open('https://docs.wpcontentai.com/wordpress-integration', '_blank')}
                              >
                                how to connect WordPress
                              </Button>
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
                            onClick={() => handleRemoveSubject(subject)}
                            className="text-secondary-foreground/70 hover:text-secondary-foreground"
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
              Follow these steps to securely connect WP Content AI with your WordPress site
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">How to generate an Application Password:</h4>
                <ol className="list-decimal pl-4 space-y-2 text-sm text-muted-foreground">
                  <li>Go to your WordPress profile page</li>
                  <li>Scroll down to "Application Passwords" section</li>
                  <li>Enter "WP Content AI" as the name</li>
                  <li>Click "Add New Application Password"</li>
                  <li>Copy the generated password (it looks like: xxxx xxxx xxxx xxxx)</li>
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
                <Label htmlFor="wpPassword">Application Password</Label>
                <Input
                  id="wpPassword"
                  type="password"
                  value={wpPassword}
                  onChange={(e) => setWpPassword(e.target.value)}
                  placeholder="Paste the generated password here"
                />
                <p className="text-sm text-muted-foreground">
                  This is the application password you just generated, not your regular WordPress password
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
