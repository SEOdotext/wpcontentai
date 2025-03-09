import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from "@/components/ui/sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useWebsites } from '@/context/WebsitesContext';
import { toast } from 'sonner';
import { ExternalLink, Globe, Plus, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WebsiteManager = () => {
  const { websites, currentWebsite, setCurrentWebsite, addWebsite, deleteWebsite, updateWebsite, isLoading } = useWebsites();
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<{ id: string; name: string; url: string } | null>(null);
  const [deleteConfirmWebsite, setDeleteConfirmWebsite] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWebsiteName.trim() || !newWebsiteUrl.trim()) {
      toast.error("Please enter both website name and URL");
      return;
    }
    
    let formattedUrl = newWebsiteUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    setIsAdding(true);
    try {
      const success = await addWebsite(newWebsiteName, formattedUrl);
      if (success) {
        setNewWebsiteName('');
        setNewWebsiteUrl('');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditWebsite = async () => {
    if (!editingWebsite) return;
    
    setIsEditing(true);
    try {
      const success = await updateWebsite(editingWebsite.id, {
        name: editingWebsite.name,
        url: editingWebsite.url
      });
      
      if (success) {
        setEditingWebsite(null);
      }
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteWebsite = async () => {
    if (!deleteConfirmWebsite) return;
    
    setIsDeleting(true);
    try {
      await deleteWebsite(deleteConfirmWebsite.id);
      setDeleteConfirmWebsite(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <div className="space-y-6 max-w-6xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Website</CardTitle>
                  <CardDescription>
                    Add a new website to manage content for
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleAddWebsite}>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="websiteName">Website Name</Label>
                        <Input 
                          id="websiteName" 
                          value={newWebsiteName}
                          onChange={(e) => setNewWebsiteName(e.target.value)}
                          placeholder="My Company Blog"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="websiteUrl">Website URL</Label>
                        <Input 
                          id="websiteUrl" 
                          value={newWebsiteUrl}
                          onChange={(e) => setNewWebsiteUrl(e.target.value)}
                          placeholder="https://myblog.com"
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isAdding}>
                      {isAdding ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding Website...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Website
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
              
              <h2 className="text-2xl font-semibold mt-8">Your Websites</h2>
              
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-1/2 mb-2" />
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-10 w-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {websites.map((website) => (
                    <Card 
                      key={website.id}
                      className={website.id === currentWebsite?.id ? 'border-primary' : ''}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Globe className="h-5 w-5" />
                          {editingWebsite?.id === website.id ? (
                            <Input
                              value={editingWebsite.name}
                              onChange={(e) => setEditingWebsite({ ...editingWebsite, name: e.target.value })}
                              className="h-7"
                            />
                          ) : (
                            website.name
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {editingWebsite?.id === website.id ? (
                          <Input
                            value={editingWebsite.url}
                            onChange={(e) => setEditingWebsite({ ...editingWebsite, url: e.target.value })}
                            className="h-7 text-sm text-muted-foreground"
                          />
                        ) : (
                          <a 
                            href={website.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground flex items-center hover:text-primary"
                          >
                            {website.url}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-between gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setCurrentWebsite(website)}
                          disabled={website.id === currentWebsite?.id}
                        >
                          {website.id === currentWebsite?.id ? 'Current Website' : 'Select Website'}
                        </Button>
                        <div className="flex gap-2">
                          {editingWebsite?.id === website.id ? (
                            <>
                              <Button
                                size="icon"
                                onClick={handleEditWebsite}
                                disabled={isEditing}
                                className="h-8 w-8"
                              >
                                {isEditing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                                <span className="sr-only">Save</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setEditingWebsite(null)}
                                disabled={isEditing}
                                className="h-8 w-8"
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Cancel</span>
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setEditingWebsite(website)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setDeleteConfirmWebsite(website)}
                                className="h-8 w-8 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <AlertDialog open={!!deleteConfirmWebsite} onOpenChange={() => setDeleteConfirmWebsite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the website{' '}
              <span className="font-semibold">{deleteConfirmWebsite?.name}</span> and remove all associated data.
              {deleteConfirmWebsite?.id === currentWebsite?.id && (
                <p className="mt-2 text-destructive font-medium">
                  Warning: You are about to delete your currently selected website. This will affect your current session.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWebsite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Website'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </SidebarProvider>
  );
};

export default WebsiteManager;
