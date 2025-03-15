import { useState } from 'react';
import { useWebsites } from '@/context/WebsitesContext';
import { useWebsiteContent } from '@/context/WebsiteContentContext';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import { Map, Download, Loader2, Link, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { SidebarProvider } from '@/components/ui/sidebar';
import WebsiteContentManager from '@/components/website/WebsiteContentManager';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const WebsiteSitemap = () => {
  const { currentWebsite } = useWebsites();
  const { importSitemapPages, importCrawledPages } = useWebsiteContent();
  const [isImporting, setIsImporting] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [showCustomUrlDialog, setShowCustomUrlDialog] = useState(false);
  const [showCrawlDialog, setShowCrawlDialog] = useState(false);
  const [customSitemapUrl, setCustomSitemapUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [maxPages, setMaxPages] = useState(50);

  const handleImportSitemap = async (customUrl?: string) => {
    if (!currentWebsite) return;
    
    setIsImporting(true);
    try {
      // If a custom URL is provided, use it directly
      if (customUrl) {
        await importSitemapPages(currentWebsite.id, customUrl);
        setShowCustomUrlDialog(false);
        return;
      }
      
      // Otherwise, try automatic detection first
      const result = await importSitemapPages(currentWebsite.id);
      
      // If no pages were imported and we have a website URL, show the custom URL dialog
      if (result === 0 && currentWebsite.url) {
        setWebsiteUrl(currentWebsite.url);
        setShowCustomUrlDialog(true);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleImportSitemap(customSitemapUrl);
  };

  const handleCrawlWebsite = async () => {
    if (!currentWebsite) return;
    
    setIsCrawling(true);
    try {
      await importCrawledPages(currentWebsite.id, maxPages);
      setShowCrawlDialog(false);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleCrawlDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCrawlWebsite();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex justify-end items-center gap-2">
                {currentWebsite && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => handleImportSitemap()}
                      disabled={isImporting || isCrawling}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Import from Sitemap
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCrawlDialog(true)}
                      disabled={isImporting || isCrawling}
                    >
                      {isCrawling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Crawling...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Crawl Website Pages
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              {/* Custom Sitemap URL Dialog */}
              <Dialog open={showCustomUrlDialog} onOpenChange={setShowCustomUrlDialog}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Sitemap Not Found</DialogTitle>
                    <DialogDescription>
                      No sitemap was found at common paths for {websiteUrl}. 
                      Please provide a direct URL to your website's sitemap.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCustomUrlSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sitemapUrl" className="text-right">
                          Sitemap URL
                        </Label>
                        <Input
                          id="sitemapUrl"
                          placeholder="https://example.com/sitemap.xml"
                          className="col-span-3"
                          value={customSitemapUrl}
                          onChange={(e) => setCustomSitemapUrl(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowCustomUrlDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isImporting}>
                        {isImporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          'Import'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Crawl Website Dialog */}
              <Dialog open={showCrawlDialog} onOpenChange={setShowCrawlDialog}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Crawl Website Pages</DialogTitle>
                    <DialogDescription>
                      This will crawl your website to discover pages when no sitemap is available.
                      Adjust the maximum number of pages to crawl below.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCrawlDialogSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="maxPages" className="text-right">
                          Max Pages
                        </Label>
                        <div className="col-span-3 flex items-center gap-4">
                          <Slider
                            id="maxPages"
                            min={10}
                            max={100}
                            step={10}
                            value={[maxPages]}
                            onValueChange={(value) => setMaxPages(value[0])}
                            className="flex-1"
                          />
                          <span className="w-12 text-center">{maxPages}</span>
                        </div>
                      </div>
                      <div className="col-span-4 text-sm text-muted-foreground">
                        Note: Crawling more pages will take longer but provide more comprehensive results.
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowCrawlDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCrawling}>
                        {isCrawling ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Crawling...
                          </>
                        ) : (
                          'Start Crawling'
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
                <WebsiteContentManager />
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default WebsiteSitemap;
