import React, { useEffect, useState, forwardRef, useCallback } from 'react';
import { useWebsiteContent } from '@/context/WebsiteContentContext';
import { useWebsites } from '@/context/WebsitesContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

// Custom styled switch component with forwardRef to fix the ref warning
const VisibleSwitch = forwardRef<HTMLDivElement, {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}>(({ checked, onCheckedChange, disabled, className }, ref) => {
  return (
    <div 
      ref={ref}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      } ${className || ''}`}
      onClick={() => !disabled && onCheckedChange(!checked)}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <span 
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`} 
      />
    </div>
  );
});

// Add display name to avoid React warnings
VisibleSwitch.displayName = 'VisibleSwitch';

/**
 * WebsiteContentManager component for managing website content
 * Uses local state to avoid reloading the entire table when toggling cornerstone content
 */
const WebsiteContentManager: React.FC = () => {
  const { websiteContent, loading: globalLoading, error, fetchWebsiteContent, setCornerstone, importPages } = useWebsiteContent();
  const { currentWebsite } = useWebsites();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [settingCornerstone, setSettingCornerstone] = useState<string | null>(null);
  const [showCornerstoneOnly, setShowCornerstoneOnly] = useState<boolean>(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [customSitemapUrl, setCustomSitemapUrl] = useState('');
  const [maxPages, setMaxPages] = useState(50);
  const [useSitemap, setUseSitemap] = useState(true);
  
  // Initialize localContent with websiteContent
  const [localContent, setLocalContent] = useState<typeof websiteContent>(websiteContent);
  // Track the last loaded website ID to detect changes
  const [lastLoadedWebsiteId, setLastLoadedWebsiteId] = useState<string | null>(null);
  // Local loading state to avoid using the global loading state
  const [localLoading, setLocalLoading] = useState<boolean>(false);

  // Use the local loading state or global loading state only for initial load
  const loading = localLoading || globalLoading;

  // Calculate cornerstone content count
  const cornerstoneContentCount = localContent.filter(content => content.is_cornerstone).length;

  // Reset local content when website changes
  useEffect(() => {
    if (currentWebsite?.id !== lastLoadedWebsiteId) {
      console.log('Website changed from', lastLoadedWebsiteId, 'to', currentWebsite?.id);
      setLocalContent([]);
      setLastLoadedWebsiteId(currentWebsite?.id || null);
      
      // Load content for the new website
      if (currentWebsite?.id) {
        console.log('Loading content for new website:', currentWebsite.id);
        setLocalLoading(true);
        fetchWebsiteContent(currentWebsite.id)
          .finally(() => setLocalLoading(false));
      }
    }
  }, [currentWebsite?.id, lastLoadedWebsiteId, fetchWebsiteContent]);

  // Update local content when websiteContent changes
  useEffect(() => {
    if (currentWebsite?.id === lastLoadedWebsiteId) {
      console.log('Updating local content for website:', currentWebsite?.id);
      setLocalContent(websiteContent);
    }
  }, [websiteContent, currentWebsite?.id, lastLoadedWebsiteId]);

  const filteredContent = localContent.filter(content => {
    if (showCornerstoneOnly) return content.is_cornerstone;
    if (activeTab === 'all') return true;
    if (activeTab === 'cornerstone') return content.is_cornerstone;
    return content.type === activeTab;
  });

  // Memoize the handleSetCornerstone function to avoid recreating it on every render
  const handleSetCornerstone = useCallback(async (contentId: string, isCurrentlyCornerstone: boolean) => {
    try {
      setSettingCornerstone(contentId);
      setLocalLoading(true);
      
      // Update the local state immediately for a responsive UI
      setLocalContent(prevContent => 
        prevContent.map(content => 
          content.id === contentId 
            ? { ...content, is_cornerstone: !isCurrentlyCornerstone } 
            : content
        )
      );
      
      // Use setCornerstone which now properly handles toggling
      // This will update the database but we don't need to reload the content
      if (currentWebsite?.id) {
        // Fire and forget - we've already updated the local state
        setCornerstone(contentId, currentWebsite.id).catch(error => {
          console.error('Error toggling cornerstone content:', error);
          // If there was an error, revert the local state change
          setLocalContent(prevContent => 
            prevContent.map(content => 
              content.id === contentId 
                ? { ...content, is_cornerstone: isCurrentlyCornerstone } 
                : content
            )
          );
        });
      }
      
    } catch (error) {
      console.error('Error toggling cornerstone content:', error);
      // If there was an error, revert the local state change
      setLocalContent(prevContent => 
        prevContent.map(content => 
          content.id === contentId 
            ? { ...content, is_cornerstone: isCurrentlyCornerstone } 
            : content
        )
      );
    } finally {
      setSettingCornerstone(null);
      setLocalLoading(false);
    }
  }, [currentWebsite?.id, setCornerstone]);

  const toggleCornerstoneOnly = (value: boolean) => {
    setShowCornerstoneOnly(value);
  };

  const handleImportPages = async () => {
    if (!currentWebsite) return;
    
    setIsImporting(true);
    try {
      await importPages(currentWebsite.id, {
        customSitemapUrl: customSitemapUrl || undefined,
        maxPages: useSitemap ? undefined : maxPages,
        useSitemap
      });
      setShowImportDialog(false);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleImportPages();
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="page">Pages</TabsTrigger>
            <TabsTrigger value="post">Posts</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
        {localContent.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Show key content only</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <VisibleSwitch
                    checked={showCornerstoneOnly}
                    onCheckedChange={toggleCornerstoneOnly}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {showCornerstoneOnly 
                    ? "Currently showing only key content" 
                    : "Toggle to show only key content"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {cornerstoneContentCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {cornerstoneContentCount}
              </Badge>
            )}
          </div>
        )}
      </div>
              
      {loading ? (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">
          <p>Error: {error}</p>
        </div>
      ) : filteredContent.length === 0 ? (
        <EmptyState 
          title="No Content Found"
          description={
            showCornerstoneOnly
              ? "No key content found. Mark some pages as key content to see them here."
              : "Import your website pages to get started with content management."
          }
          icon={showCornerstoneOnly ? <Star className="h-6 w-6" /> : <Download className="h-6 w-6" />}
          actionLabel={showCornerstoneOnly ? "Show All Content" : "Import Pages"}
          onAction={showCornerstoneOnly ? () => setShowCornerstoneOnly(false) : () => setShowImportDialog(true)}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Key Content</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContent.map((content) => (
              <TableRow key={content.id} className={content.is_cornerstone ? "bg-green-50" : ""}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {content.title}
                    {content.is_cornerstone && (
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200 text-xs">
                        Cornerstone
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="truncate max-w-[200px]">
                  <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {content.url}
                  </a>
                </TableCell>
                <TableCell>
                  <Badge variant={content.type === 'page' ? 'default' : content.type === 'post' ? 'secondary' : 'outline'}>
                    {content.type}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(content.updated_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <VisibleSwitch
                          checked={content.is_cornerstone}
                          onCheckedChange={() => handleSetCornerstone(content.id, content.is_cornerstone)}
                          disabled={settingCornerstone === content.id}
                          className={settingCornerstone === content.id ? "opacity-50" : ""}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="left" align="center">
                        {content.is_cornerstone 
                          ? "Click to remove from key content" 
                          : "Click to mark as key content"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Import Pages Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Import Website Pages</DialogTitle>
            <DialogDescription>
              Choose how you want to discover and import pages from your website.
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
                      {useSitemap ? 
                        "Using sitemap for faster and more accurate page discovery" :
                        "Crawling the website to find pages (slower but works without a sitemap)"}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="useSitemap" className={!useSitemap ? "text-muted-foreground" : ""}>
                      Crawl
                    </Label>
                    <Switch
                      id="useSitemap"
                      checked={!useSitemap}
                      onCheckedChange={(checked) => setUseSitemap(!checked)}
                    />
                    <Label htmlFor="useSitemap" className={useSitemap ? "text-muted-foreground" : ""}>
                      Sitemap
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
    </div>
  );
};

export default WebsiteContentManager; 