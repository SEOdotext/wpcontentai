
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from "@/components/ui/sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';

const Settings = () => {
  const { publicationFrequency, setPublicationFrequency } = useSettings();
  const [frequency, setFrequency] = React.useState(publicationFrequency);

  const handleSave = () => {
    setPublicationFrequency(frequency);
    toast.success("Settings saved successfully");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <div className="space-y-4 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Settings</h1>
              </div>
              
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
                      <Button onClick={handleSave}>Save</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
};

export default Settings;
