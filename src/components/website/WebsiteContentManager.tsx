import React, { useEffect, useState, forwardRef, useCallback, useImperativeHandle } from 'react';
import { useWebsiteContent, WebsiteContent } from '@/context/WebsiteContentContext';
import { useWebsites } from '@/context/WebsitesContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, FileText, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import ContentViewModal from './ContentViewModal';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? 'bg-blue-600' : 'bg-gray-300',
        className
      )}
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

// Define the ref interface
export interface WebsiteContentManagerRef {
  handleSuggestions: (suggestions: Array<{ id: string; reason: string }>) => void;
}

/**
 * WebsiteContentManager component for managing website content
 * Uses local state to avoid reloading the entire table when toggling cornerstone content
 */
const WebsiteContentManager = forwardRef<WebsiteContentManagerRef, {
  onImportClick?: () => void;
}>(({
  onImportClick
}, ref) => {
  const { websiteContent, loading: globalLoading, error, fetchWebsiteContent, setCornerstone } = useWebsiteContent();
  const { currentWebsite } = useWebsites();

  const [settingCornerstone, setSettingCornerstone] = useState<string | null>(null);
  const [showCornerstoneOnly, setShowCornerstoneOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; reason: string }>>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Initialize localContent with websiteContent
  const [localContent, setLocalContent] = useState<typeof websiteContent>(websiteContent);
  // Track the last loaded website ID to detect changes
  const [lastLoadedWebsiteId, setLastLoadedWebsiteId] = useState<string | null>(null);
  // Local loading state to avoid using the global loading state
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  const [selectedContent, setSelectedContent] = useState<typeof websiteContent[0] | null>(null);

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

  // Sync localContent with websiteContent when it changes
  useEffect(() => {
    setLocalContent(websiteContent);
  }, [websiteContent]);

  const filteredContent = localContent.filter(content => {
    // First apply the cornerstone filter
    if (showCornerstoneOnly && !content.is_cornerstone) return false;
    
    // Then apply the search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return content.title.toLowerCase().includes(searchLower) || 
             content.url.toLowerCase().includes(searchLower);
    }
    
    return true;
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

  const handleSuggestKeyContent = async () => {
    if (!currentWebsite?.id) return;
    
    setIsLoadingSuggestions(true);
    try {
      console.log('Fetching suggestions for website:', currentWebsite.id);
      console.log('Available content:', localContent);
      
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
        const isValid = suggestion && suggestion.id && suggestion.reason;
        if (!isValid) {
          console.warn('Invalid suggestion:', suggestion);
        }
        return isValid;
      });
      
      console.log('Valid suggestions:', validSuggestions);
      console.log('Available pages:', data.debug?.available_pages);
      
      setSuggestions(validSuggestions);
      // Initialize all suggestions as selected
      setSelectedSuggestions(new Set(validSuggestions.map(s => s.id)));
      setShowSuggestionsDialog(true);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast.error('Failed to get key content suggestions');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleApplySuggestions = async () => {
    if (!currentWebsite?.id) return;
    
    try {
      // Only apply selected suggestions
      const selectedSuggestionsList = suggestions.filter(s => selectedSuggestions.has(s.id));
      
      // Apply selected suggestions
      for (const suggestion of selectedSuggestionsList) {
        await setCornerstone(suggestion.id, currentWebsite.id);
        
        // Update local content immediately after each suggestion is applied
        setLocalContent(prevContent => 
          prevContent.map(content => 
            content.id === suggestion.id 
              ? { ...content, is_cornerstone: true }
              : content
          )
        );
      }
      
      toast.success(`Successfully marked ${selectedSuggestionsList.length} pages as key content`);
      setShowSuggestionsDialog(false);
    } catch (error) {
      console.error('Error applying suggestions:', error);
      toast.error('Failed to apply suggestions');
    }
  };

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleSuggestions: (newSuggestions: Array<{ id: string; reason: string }>) => {
      setSuggestions(newSuggestions);
      setSelectedSuggestions(new Set(newSuggestions.map(s => s.id)));
      setShowSuggestionsDialog(true);
    }
  }));

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'page':
        return 'Page';
      case 'post':
        return 'Post';
      case 'category':
        return 'Category';
      case 'post_category':
        return 'Post Category';
      case 'product':
        return 'Product';
      case 'product_category':
        return 'Product Category';
      case 'sitemap':
        return 'Sitemap';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search titles or URLs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[300px]"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {localContent.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Show key content only</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex justify-center">
                      <VisibleSwitch
                        checked={showCornerstoneOnly}
                        onCheckedChange={toggleCornerstoneOnly}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
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
      </div>
              
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : filteredContent.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No content found"
          description="Import your website content to get started"
          onAction={onImportClick || (() => {
            if (currentWebsite?.id) {
              console.log('No import handler provided, refreshing content for website:', currentWebsite.id);
              setLocalLoading(true);
              fetchWebsiteContent(currentWebsite.id)
                .finally(() => setLocalLoading(false));
            }
          })}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[100px]">Key Content</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContent.map((content) => (
                <TableRow key={content.id}>
                  <TableCell 
                    className="font-medium cursor-pointer hover:text-primary"
                    onClick={() => setSelectedContent(content)}
                  >
                    {content.title}
                  </TableCell>
                  <TableCell>
                    <a 
                      href={content.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {content.url}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getContentTypeLabel(content.content_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(content.last_fetched).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSetCornerstone(content.id, content.is_cornerstone)}
                            disabled={settingCornerstone === content.id}
                            className={cn(
                              "h-8 w-8 p-0",
                              content.is_cornerstone && "text-yellow-500 hover:text-yellow-600"
                            )}
                          >
                            <Star className={cn(
                              "h-4 w-4",
                              content.is_cornerstone ? "fill-current" : "fill-none"
                            )} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {content.is_cornerstone 
                            ? "Remove from key content" 
                            : "Mark as key content"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedContent && (
        <ContentViewModal
          isOpen={!!selectedContent}
          onClose={() => setSelectedContent(null)}
          title={selectedContent.title}
          content={selectedContent.content}
          digest={selectedContent.digest}
          lastFetched={selectedContent.last_fetched}
        />
      )}

      {/* Key Content Suggestions Dialog */}
      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Suggested Key Content</DialogTitle>
            <DialogDescription>
              Select which pages you want to mark as key content. Each suggestion includes a reason why the page is important.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="space-y-4 py-4">
              {suggestions.map((suggestion) => {
                console.log('Processing suggestion:', suggestion);
                const page = localContent.find(p => p.id === suggestion.id);
                console.log('Found matching page:', page);
                if (!page) {
                  console.log('No matching page found for suggestion:', suggestion);
                  return null;
                }
                
                return (
                  <div key={suggestion.id} className="flex items-start gap-4 p-4 rounded-lg border">
                    <VisibleSwitch
                      checked={selectedSuggestions.has(suggestion.id)}
                      onCheckedChange={() => toggleSuggestion(suggestion.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{page.title}</h4>
                        <a 
                          href={page.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-500 hover:text-blue-600 hover:underline"
                        >
                          ↗
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{suggestion.reason}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {page.content_type ? getContentTypeLabel(page.content_type) : page.type}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <div className="flex items-center gap-2 mr-auto">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedSuggestions(new Set(suggestions.map(s => s.id)))}
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedSuggestions(new Set())}
              >
                Clear All
              </Button>
            </div>
            <Button variant="outline" onClick={() => setShowSuggestionsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplySuggestions}
              disabled={selectedSuggestions.size === 0}
            >
              Apply Selected ({selectedSuggestions.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default WebsiteContentManager; 