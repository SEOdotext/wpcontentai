import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  digest?: string;
  lastFetched: string;
}

/**
 * Cleans and formats HTML content for better display
 * Removes WordPress shortcodes and other unwanted elements
 */
const cleanContentForDisplay = (content: string): string => {
  if (!content) return '';
  
  // Remove WordPress shortcodes
  let cleanedContent = content.replace(/\[\/?[^\]]+\]/g, '');
  
  // Check if content has HTML tags
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(cleanedContent);
  
  if (!hasHtmlTags) {
    // Format plain text with paragraph tags
    return cleanedContent
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 0)
      .map(p => `<p>${p.trim().replace(/\n/g, '<br />')}</p>`)
      .join('\n');
  }
  
  // For HTML content, do additional cleaning
  
  // Remove any remaining images
  cleanedContent = cleanedContent.replace(/<img[^>]*>/gi, '');
  
  // Remove any remaining iframes
  cleanedContent = cleanedContent.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  
  // Remove any remaining SVGs
  cleanedContent = cleanedContent.replace(/<svg[^>]*>.*?<\/svg>/gi, '');
  
  // Remove any remaining buttons
  cleanedContent = cleanedContent.replace(/<button[^>]*>.*?<\/button>/gi, '');
  
  // Remove any remaining forms
  cleanedContent = cleanedContent.replace(/<form[^>]*>.*?<\/form>/gi, '');
  
  // Remove any remaining scripts
  cleanedContent = cleanedContent.replace(/<script[^>]*>.*?<\/script>/gi, '');
  
  // Remove any remaining styles
  cleanedContent = cleanedContent.replace(/<style[^>]*>.*?<\/style>/gi, '');
  
  // Remove any remaining links that look like buttons
  cleanedContent = cleanedContent.replace(/<a[^>]*class="[^"]*button[^"]*"[^>]*>.*?<\/a>/gi, '');
  cleanedContent = cleanedContent.replace(/<a[^>]*class="[^"]*btn[^"]*"[^>]*>.*?<\/a>/gi, '');
  
  // Remove excessive whitespace
  cleanedContent = cleanedContent.replace(/\s{2,}/g, ' ');
  
  // Ensure paragraphs have proper spacing
  cleanedContent = cleanedContent.replace(/<\/p>\s*<p>/g, '</p>\n<p>');
  
  // Ensure headings have proper spacing
  cleanedContent = cleanedContent.replace(/<\/h([1-6])>\s*<([^>]+)>/g, '</h$1>\n<$2>');
  
  // Replace consecutive <br> tags with paragraph breaks
  cleanedContent = cleanedContent.replace(/(<br\s*\/?>\s*){2,}/gi, '</p><p>');
  
  // Add paragraph tags to text blocks that don't have them
  if (!cleanedContent.includes('<p>')) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanedContent;
    
    // Get all text nodes that are direct children of the div
    const textNodes = Array.from(tempDiv.childNodes)
      .filter(node => node.nodeType === 3 && node.textContent?.trim());
    
    // Replace text nodes with paragraphs
    textNodes.forEach(node => {
      if (node.textContent) {
        const p = document.createElement('p');
        p.textContent = node.textContent.trim();
        if (p.textContent) {
          node.parentNode?.replaceChild(p, node);
        }
      }
    });
    
    cleanedContent = tempDiv.innerHTML;
  }
  
  return cleanedContent;
};

const ContentViewModal: React.FC<ContentViewModalProps> = ({
  isOpen,
  onClose,
  title,
  content,
  digest,
  lastFetched,
}) => {
  // Process content to ensure proper formatting
  const formattedContent = useMemo(() => {
    return cleanContentForDisplay(content);
  }, [content]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Last analyzed: {new Date(lastFetched).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] mt-4">
          {digest && (
            <div className="p-4 mb-4 bg-muted rounded-md">
              <h3 className="text-sm font-medium mb-2">Content Summary</h3>
              <p className="text-sm text-muted-foreground">{digest}</p>
            </div>
          )}
          {formattedContent ? (
            <div 
              className="p-4 bg-gray-50 rounded-md content-view"
              dangerouslySetInnerHTML={{ __html: formattedContent }}
            />
          ) : (
            <div className="p-4 bg-gray-50 rounded-md">
              No content available. Try analyzing the content first.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ContentViewModal; 