import React, { useEffect, useState, forwardRef } from 'react';
import { useWebsiteContent } from '@/context/WebsiteContentContext';
import { useWebsites } from '@/context/WebsitesContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

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
  const { websiteContent, loading, error, fetchWebsiteContent, setCornerstone } = useWebsiteContent();
  const { currentWebsite } = useWebsites();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [settingCornerstone, setSettingCornerstone] = useState<string | null>(null);
  const [showCornerstoneOnly, setShowCornerstoneOnly] = useState<boolean>(false);
  
  // Initialize localContent with websiteContent
  const [localContent, setLocalContent] = useState<typeof websiteContent>(websiteContent);

  // Calculate cornerstone content count
  const cornerstoneContentCount = localContent.filter(content => content.is_cornerstone).length;

  const filteredContent = localContent.filter(content => {
    if (showCornerstoneOnly) return content.is_cornerstone;
    if (activeTab === 'all') return true;
    if (activeTab === 'cornerstone') return content.is_cornerstone;
    return content.type === activeTab;
  });

  const handleSetCornerstone = async (contentId: string, isCurrentlyCornerstone: boolean) => {
    try {
      setSettingCornerstone(contentId);
      
      // Update the local state immediately for a responsive UI
      setLocalContent(prevContent => 
        prevContent.map(content => 
          content.id === contentId 
            ? { ...content, is_cornerstone: !isCurrentlyCornerstone } 
            : content
        )
      );
      
      // Use setCornerstone which now properly handles toggling
      if (currentWebsite?.id) {
        await setCornerstone(contentId, currentWebsite.id);
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
    }
  };

  const toggleCornerstoneOnly = (value: boolean) => {
    setShowCornerstoneOnly(value);
  };

  // Load content when website changes - only load once when the website changes
  useEffect(() => {
    if (currentWebsite?.id && websiteContent.length === 0) {
      console.log('Initial content load for website:', currentWebsite.id);
      fetchWebsiteContent(currentWebsite.id);
    }
  }, [currentWebsite?.id, fetchWebsiteContent, websiteContent.length]);

  // Update local content when websiteContent changes
  useEffect(() => {
    if (websiteContent.length > 0) {
      setLocalContent(websiteContent);
    }
  }, [websiteContent]);

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
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Show cornerstone only</span>
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
                  ? "Currently showing only cornerstone content" 
                  : "Toggle to show only cornerstone content"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {cornerstoneContentCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5">
              {cornerstoneContentCount}
            </Badge>
          )}
        </div>
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
        <div className="text-center py-4">
          <p>No content found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Last Updated</TableHead>
              <TableHead className="text-center">Cornerstone Content</TableHead>
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
                          disabled={settingCornerstone === content.id || loading}
                          className={settingCornerstone === content.id ? "opacity-50" : ""}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        {content.is_cornerstone 
                          ? "Click to remove from cornerstone content" 
                          : "Click to add to cornerstone content for generating writing prompts"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
    </div>
  );
};

export default WebsiteContentManager; 