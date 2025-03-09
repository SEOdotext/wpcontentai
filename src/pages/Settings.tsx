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
import { toast } from 'sonner';
import { X, Plus, Loader2, Globe } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

const Settings = () => {
  const { publicationFrequency, setPublicationFrequency, writingStyle, setWritingStyle, subjectMatters, setSubjectMatters, isLoading } = useSettings();
  const { currentWebsite } = useWebsites();
  const [frequency, setFrequency] = useState(publicationFrequency);
  const [styleInput, setStyleInput] = useState(writingStyle);
  const [subjects, setSubjects] = useState<string[]>(subjectMatters);
  const [newSubject, setNewSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setFrequency(publicationFrequency);
      setStyleInput(writingStyle);
      setSubjects(subjectMatters);
    }
  }, [isLoading, publicationFrequency, writingStyle, subjectMatters]);

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
            
            {isLoading ? (
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
      <Toaster />
    </div>
  );
};

export default Settings;
