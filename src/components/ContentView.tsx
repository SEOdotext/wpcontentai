import React from 'react';
import { ArrowLeft, Calendar as CalendarIcon, Edit, RefreshCw, Tag, Trash, X, Send, FileEdit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
  wpSentDate?: string;
  onClose: () => void;
  onDeleteClick?: () => void;
  onEditClick?: () => void;
  onRegenerateClick?: () => void;
  isGeneratingContent?: boolean;
}

const ContentView: React.FC<ContentViewProps> = ({
  title,
  description,
  fullContent,
  keywords = [],
  dateCreated,
  status = 'draft',
  wpSentDate,
  onClose,
  onDeleteClick,
  onEditClick,
  onRegenerateClick,
  isGeneratingContent = false,
}) => {
  const contentToDisplay = fullContent || description || '';
  
  const hasContent = !!(fullContent || description);

  const formattedWpSentDate = wpSentDate ? new Date(wpSentDate).toLocaleString() : null;

  return (
    <Sheet open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetPortal>
        <SheetOverlay onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" onClick={(e) => e.stopPropagation()}>
          <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 shadow-lg">
            <CardHeader className="p-3 sm:p-4 md:p-6 flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col overflow-hidden">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl truncate">{title}</CardTitle>
                  {isGeneratingContent && (
                    <span className="text-xs text-blue-600 flex items-center mt-1">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Generating content with AI...
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onRegenerateClick && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={onRegenerateClick}
                    title={isGeneratingContent ? "Generating content..." : "Regenerate with AI"}
                    disabled={isGeneratingContent}
                  >
                    {isGeneratingContent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {onEditClick && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={onEditClick}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDeleteClick && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={onDeleteClick}
                    title="Delete"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            
            <div className="px-3 sm:px-4 md:px-6 flex flex-wrap gap-3 items-center shrink-0">
              {dateCreated && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{dateCreated}</span>
                </div>
              )}
              
              {keywords.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  <span>{keywords.length} keywords</span>
                </div>
              )}
              
              {wpSentDate && (
                <Badge 
                  variant="outline" 
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  <span>Sent to WordPress</span>
                </Badge>
              )}
            </div>
            
            <Separator className="my-3" />
            
            <CardContent className="overflow-y-auto p-3 sm:p-4 md:p-6 flex-1 blog-content">
              {hasContent ? (
                <div 
                  className="wordpress-content prose prose-sm md:prose lg:prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: contentToDisplay }} 
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="rounded-full bg-blue-50 p-3">
                      <FileEdit className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-medium">No content generated yet</p>
                      <p className="text-sm max-w-md">Generate content with AI to create an optimized blog post based on the title and keywords.</p>
                    </div>
                    {onRegenerateClick && (
                      <Button
                        onClick={onRegenerateClick}
                        className="mt-2"
                        disabled={isGeneratingContent}
                      >
                        {isGeneratingContent ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            
            {wpSentDate && (
              <div className="px-3 sm:px-4 md:px-6 py-2 bg-emerald-50 text-emerald-700 text-xs">
                <div className="flex items-center gap-2">
                  <Send className="h-3 w-3" />
                  <span>
                    Sent to WordPress on {formattedWpSentDate}
                  </span>
                </div>
              </div>
            )}
            
            {keywords.length > 0 && (
              <>
                <Separator className="mt-0 mb-3" />
                <div className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6 shrink-0">
                  <h3 className="text-sm font-medium mb-2">Keywords:</h3>
                  <div className="flex flex-wrap gap-2 overflow-y-auto max-h-20">
                    {keywords.map((keyword, index) => (
                      <Badge 
                        key={index}
                        variant="outline" 
                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                      >
                        {typeof keyword === 'string' ? keyword : keyword.text}
                      </Badge>
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
