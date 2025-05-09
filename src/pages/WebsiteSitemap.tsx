import { useState, useRef, useEffect } from 'react';
import { useWebsites } from '@/context/WebsitesContext';
import { useWebsiteContent } from '@/context/WebsiteContentContext';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import { Map, Download, Loader2, Link, Search, FileText, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { SidebarProvider } from '@/components/ui/sidebar';
import WebsiteContentManager, { WebsiteContentManagerRef } from '@/components/website/WebsiteContentManager';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Website } from '@/types/website';
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

const WebsiteSitemap = () => {
  const { currentWebsite } = useWebsites();
  const { importPages, scrapeCornerstone, websiteContent } = useWebsiteContent();
  const [isImporting, setIsImporting] = useState(false);
  const [isScrapingCornerstone, setIsScrapingCornerstone] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [maxPages, setMaxPages] = useState(10);
  const [useSitemap, setUseSitemap] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const navigate = useNavigate();
  const [website, setWebsite] = useState<Website | null>(null);
  const [customSitemapUrl, setCustomSitemapUrl] = useState('');
  const [showResetWarning, setShowResetWarning] = useState(false);

  // Check if we have any cornerstone content
  const hasContent = websiteContent.length > 0;
  const hasCornerstoneContent = websiteContent.some(content => content.is_cornerstone);
  const cornerstoneCount = websiteContent.filter(content => content.is_cornerstone).length;
  const importedCount = websiteContent.length; // Count of all imported pages

  // Create a ref to access WebsiteContentManager methods
  const websiteContentManagerRef = useRef<WebsiteContentManagerRef>(null);

  // Fetch website details including limits
  useEffect(() => {
    const fetchWebsite = async () => {
      if (!currentWebsite?.id) return;
      
      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .eq('id', currentWebsite.id)
        .single();
        
      if (error) {
        console.error('Error fetching website:', error);
        return;
      }
      
      setWebsite(data);
      // Set initial maxPages to website's limit or default to 10
      setMaxPages(data?.page_import_limit || 10);
    };
    
    fetchWebsite();
  }, [currentWebsite?.id]);

  const handleImportPages = async () => {
    if (!currentWebsite) return;
    
    setIsImporting(true);
    try {
      // Special handling for WorkForceEU.com
      let sitemapUrl = customSitemapUrl || undefined;
      if (currentWebsite.url?.includes('workforceeu.com') && !sitemapUrl) {
        console.log('Detected WorkForceEU.com website - using known sitemap URL');
        sitemapUrl = 'https://workforceeu.com/sitemap_index.xml';
      }
      
      const importedCount = await importPages(currentWebsite.id, {
        customSitemapUrl: sitemapUrl,
        maxPages: useSitemap ? undefined : maxPages,
        useSitemap
      });
      
      setShowImportDialog(false);
      
      // If pages were imported successfully, stay on the sitemap page
      if (importedCount > 0) {
        console.log(`Successfully imported ${importedCount} pages, refreshing sitemap view`);
        // Small delay to allow state to update
        setTimeout(() => {
          navigate('/sitemap');
        }, 500);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleScrapeCornerstone = async () => {
    if (!currentWebsite) return;
    
    setIsScrapingCornerstone(true);
    try {
      await scrapeCornerstone(currentWebsite.id);
    } finally {
      setIsScrapingCornerstone(false);
    }
  };

  const handleImportDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleImportPages();
  };

  const handleResetSitemap = async () => {
    if (!currentWebsite?.id) return;
    
    try {
      const { error } = await supabase
        .from('website_content')
        .delete()
        .eq('website_id', currentWebsite.id);
        
      if (error) throw error;
      
      toast.success('Sitemap reset successfully');
      setShowImportDialog(false);
      setShowResetWarning(false);
      
      // Force a hard reload to clear all state
      window.location.reload();
    } catch (error) {
      console.error('Error resetting sitemap:', error);
      toast.error('Failed to reset sitemap');
    }
  };

  const handleSuggestKeyContent = async () => {
    if (!currentWebsite?.id) return;
    
    setIsLoadingSuggestions(true);
    try {
      console.log('Fetching suggestions for website:', currentWebsite.id);
      console.log('Available content:', websiteContent);
      
      const { data, error } = await supabase.functions.invoke('suggest-key-content', {
        body: { website_id: currentWebsite.id }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      console.log('Received suggestions response:', data);
      
      if (data.error) {
        console.error('Suggestions API error:', data.error);
        toast.error(data.message || 'Failed to get suggestions');
        return;
      }
      
      // Validate suggestions
      const validSuggestions = data.suggestions.filter((suggestion: any) => {
        const isValid = suggestion && suggestion.id && suggestion.title && suggestion.url;
        if (!isValid) {
          console.warn('Invalid suggestion:', suggestion);
        }
        return isValid;
      });
      
      console.log('Valid suggestions:', validSuggestions);
      console.log('Available pages:', data.debug?.available_pages);
      
      // Pass suggestions to WebsiteContentManager
      if (websiteContentManagerRef.current) {
        websiteContentManagerRef.current.handleSuggestions(validSuggestions);
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast.error('Failed to get key content suggestions');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex justify-end items-center gap-2">
                {currentWebsite && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowImportDialog(true)}
                      disabled={isImporting || isScrapingCornerstone}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Import Pages
                          {importedCount > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 px-1.5 bg-white/20">
                              {importedCount}
                            </Badge>
                          )}
                        </>
                      )}
                    </Button>
                    
                    {/* Suggest Key Content button */}
                    {hasContent && (
                      <Button
                        variant="outline"
                        onClick={handleSuggestKeyContent}
                        disabled={isImporting || isScrapingCornerstone}
                        className="gap-2"
                      >
                        {isLoadingSuggestions ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Getting Suggestions...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Suggest Key Content
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Only show Update Key Content button if we have content */}
                    {hasContent && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              // Use primary variant if we have cornerstone content
                              variant={hasCornerstoneContent ? "default" : "outline"}
                              onClick={handleScrapeCornerstone}
                              disabled={isImporting || isScrapingCornerstone}
                            >
                              {isScrapingCornerstone ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Update Key Content
                                  {cornerstoneCount > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 bg-white/20">
                                      {cornerstoneCount}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="end" sideOffset={5} className="max-w-[300px] text-sm">
                            This tool visits your website to read and analyze your key content pages.
                            It extracts writing style, structure, and terminology from your actual live content
                            to use as a reference when generating new content that matches your brand voice.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                )}
              </div>

              {/* Import Pages Dialog */}
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Import Website Pages</DialogTitle>
                    <DialogDescription>
                      Let's discover and import your website's content - choose your preferred method below.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleImportDialogSubmit}>
                    <div className="grid gap-6 py-4">
                      {/* Import Method Selection */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border bg-muted/50">
                          <div className="space-y-0.5">
                            <Label htmlFor="useSitemap" className="text-base">Import Method</Label>
                            <div className="text-sm text-muted-foreground">
                              {!useSitemap ? 
                                "Using sitemap for faster and more accurate page discovery" :
                                "Crawling the website to find pages (slower but works without a sitemap)"}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="useSitemap" className={!useSitemap ? "text-muted-foreground" : ""}>
                              Sitemap
                            </Label>
                            <Switch
                              id="useSitemap"
                              checked={!useSitemap}
                              onCheckedChange={(checked) => setUseSitemap(!checked)}
                            />
                            <Label htmlFor="useSitemap" className={useSitemap ? "text-muted-foreground" : ""}>
                              Crawl
                            </Label>
                          </div>
                        </div>
                      </div>
                      
                      {/* Sitemap URL Input */}
                      {useSitemap && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="sitemapUrl">Sitemap URL (Optional)</Label>
                            <Input
                              id="sitemapUrl"
                              placeholder="https://example.com/sitemap.xml"
                              value={customSitemapUrl}
                              onChange={(e) => setCustomSitemapUrl(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                              Leave empty to automatically detect your website's sitemap location.
                              Only provide a URL if auto-detection fails.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Crawl Settings */}
                      {!useSitemap && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label>Maximum Pages to Import</Label>
                                <p className="text-sm text-muted-foreground">
                                  Select how many pages to import (max {website?.page_import_limit || 500})
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Higher numbers will take longer but provide more comprehensive results.
                                  Start with a lower number to test the import process.
                                </p>
                                <p className="text-sm text-primary mt-1">
                                  Need to import more pages? You can upgrade your page import limit in website settings.
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Slider
                                  value={[maxPages]}
                                  onValueChange={(value) => setMaxPages(value[0])}
                                  min={1}
                                  max={website?.page_import_limit || 500}
                                  step={1}
                                  className="w-[200px]"
                                />
                                <span className="w-12 text-right">{maxPages}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <div className="flex items-center gap-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowResetWarning(true)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          Reset Sitemap
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowImportDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isImporting}>
                          {isImporting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            'Start Import'
                          )}
                        </Button>
                      </div>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Reset Warning Dialog */}
              <AlertDialog open={showResetWarning} onOpenChange={setShowResetWarning}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Reset Sitemap
                    </AlertDialogTitle>
                    <div className="text-sm text-muted-foreground">
                      This will permanently delete all imported pages, including:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All page content and metadata</li>
                        <li>Key content designations</li>
                        <li>Content digests and analysis</li>
                      </ul>
                      <p className="mt-3 font-medium">This action cannot be undone.</p>
                    </div>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetSitemap}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Reset Sitemap
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {!currentWebsite ? (
                <EmptyState 
                  title="No Website Selected"
                  description="Please select a website from the dropdown in the sidebar to view its content structure."
                  icon={<Map className="h-6 w-6" />}
                  onAction={() => {}}
                  actionLabel="Select Website"
                />
              ) : (
                <WebsiteContentManager 
                  ref={websiteContentManagerRef}
                  onImportClick={() => setShowImportDialog(true)} 
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default WebsiteSitemap;
