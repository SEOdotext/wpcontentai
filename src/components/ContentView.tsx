
import React from 'react';
import { ArrowLeft, Calendar, Star, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import KeywordBadge from './KeywordBadge';
import { cn } from '@/lib/utils';
import { Keyword } from './ContentCard';
import {
  Sheet,
  SheetContent,
  SheetOverlay,
  SheetPortal,
} from '@/components/ui/sheet';

interface ContentViewProps {
  title: string;
  description?: string;
  fullContent?: string;
  keywords?: Keyword[];
  dateCreated?: string;
  status?: 'draft' | 'published' | 'scheduled';
  isFavorite?: boolean;
  onClose: () => void;
  onFavoriteToggle?: () => void;
}

const ContentView: React.FC<ContentViewProps> = ({
  title,
  description,
  fullContent,
  keywords = [],
  dateCreated,
  status = 'draft',
  isFavorite = false,
  onClose,
  onFavoriteToggle,
}) => {
  const statusStyles = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };

  const defaultContent = `
    <p>This is an example of full content that would be displayed in the content view. 
    In a real application, this would be loaded from a database or CMS and could include 
    formatted HTML content with headings, paragraphs, lists, images, and more.</p>
    
    <h2>Sample Heading</h2>
    <p>The article continues with more detailed information about the topic.</p>
    
    <ul>
      <li>Point one about the topic</li>
      <li>Another important consideration</li>
      <li>Final key takeaway</li>
    </ul>
    
    <p>This is just placeholder content to demonstrate how the full article would look 
    when displayed in this component.</p>
  `;

  return (
    <Sheet open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetPortal>
        <SheetOverlay onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8" onClick={(e) => e.stopPropagation()}>
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="text-xl md:text-2xl">{title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    isFavorite ? 'text-amber-500' : 'text-muted-foreground'
                  )}
                  onClick={onFavoriteToggle}
                >
                  <Star className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            
            <div className="px-4 md:px-6 flex flex-wrap gap-3 items-center">
              {status && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusStyles[status])}>
                  {status}
                </span>
              )}
              
              {dateCreated && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{dateCreated}</span>
                </div>
              )}
              
              {keywords.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  <span>{keywords.length} keywords</span>
                </div>
              )}
            </div>
            
            {description && (
              <div className="px-4 md:px-6 mt-4">
                <p className="text-muted-foreground italic">{description}</p>
              </div>
            )}
            
            <Separator className="my-4" />
            
            <CardContent className="overflow-y-auto p-4 md:p-6 flex-1">
              {fullContent ? (
                <div dangerouslySetInnerHTML={{ __html: fullContent }} />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: defaultContent }} />
              )}
            </CardContent>
            
            {keywords.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="px-4 md:px-6 pb-4 md:pb-6">
                  <h3 className="text-sm font-medium mb-2">Keywords:</h3>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <KeywordBadge 
                        key={index} 
                        keyword={keyword.text} 
                        difficulty={keyword.difficulty}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </SheetPortal>
    </Sheet>
  );
};

export default ContentView;
