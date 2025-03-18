import { useState } from 'react';
import { useWebsites } from '@/context/WebsitesContext';
import { useWebsiteContent } from '@/context/WebsiteContentContext';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import { Map, Download, Loader2, Link, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { SidebarProvider } from '@/components/ui/sidebar';
import WebsiteContentManager from '@/components/website/WebsiteContentManager';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";

const WebsiteSitemap = () => {
  const { currentWebsite } = useWebsites();
  const { importPages, scrapeCornerstone, websiteContent } = useWebsiteContent();
  const [isImporting, setIsImporting] = useState(false);
  const [isScrapingCornerstone, setIsScrapingCornerstone] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [customSitemapUrl, setCustomSitemapUrl] = useState('');
  const [maxPages, setMaxPages] = useState(50);
  const [useSitemap, setUseSitemap] = useState(true);
  const navigate = useNavigate();
  
  // Check if we have any cornerstone content
  const hasContent = websiteContent.length > 0;
  const hasCornerstoneContent = websiteContent.some(content => content.is_cornerstone);
  const cornerstoneCount = websiteContent.filter(content => content.is_cornerstone).length;

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
      
      // If pages were imported successfully, navigate to the content page
      if (importedCount > 0) {
        console.log(`Successfully imported ${importedCount} pages, navigating to content page`);
        // Small delay to allow state to update
        setTimeout(() => {
          navigate('/website/content');
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
                        </>
                      )}
                    </Button>
                    
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
                            <div className="flex justify-between items-center">
                              <Label htmlFor="maxPages">Number of Pages to Crawl</Label>
                              <span className="text-sm font-medium">{maxPages} pages</span>
                            </div>
                            <Slider
                              id="maxPages"
                              min={10}
                              max={100}
                              step={10}
                              value={[maxPages]}
                              onValueChange={(value) => setMaxPages(value[0])}
                              className="py-2"
                            />
                            <p className="text-sm text-muted-foreground">
                              Higher numbers will take longer but provide more comprehensive results.
                              Start with a lower number to test the import process.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
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
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {!currentWebsite ? (
                <EmptyState 
                  title="No Website Selected"
                  description="Please select a website from the dropdown in the sidebar to view its content structure."
                  icon={<Map className="h-6 w-6" />}
                  onAction={() => {}}
                  actionLabel="Select Website"
                />
              ) : (
                <WebsiteContentManager onImportClick={() => setShowImportDialog(true)} />
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default WebsiteSitemap;
