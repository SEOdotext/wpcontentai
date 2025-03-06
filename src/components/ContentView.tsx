import React from 'react';
import { ArrowLeft, Calendar as CalendarIcon, MoreHorizontal, Tag as TagIcon, X } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ContentViewProps {
  title: string;
  description?: string;
  fullContent?: string;
  keywords?: Keyword[];
  dateCreated?: string;
  status?: 'draft' | 'published' | 'scheduled';
  onClose: () => void;
  onDeleteClick?: () => void;
}

const ContentView: React.FC<ContentViewProps> = ({
  title,
  description,
  fullContent,
  keywords = [],
  dateCreated,
  status = 'draft',
  onClose,
  onDeleteClick,
}) => {
  const defaultContent = `<p>This is the default content. You can replace it with your own content.</p>`;

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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={onDeleteClick}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            
            <div className="px-4 md:px-6 flex flex-wrap gap-3 items-center">
              {dateCreated && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{dateCreated}</span>
                </div>
              )}
              
              {keywords.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TagIcon className="h-3 w-3" />
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
