import React from 'react';
import { ArrowLeft, Calendar as CalendarIcon, RefreshCw, Tag, Trash, X, Send, FileEdit, Loader2, ExternalLink, Image } from 'lucide-react';
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
  wpPostUrl?: string;
  preview_image_url?: string;
  onClose: () => void;
  onDeleteClick?: () => void;
  onRegenerateClick?: () => void;
  onGenerateImage?: () => void;
  onSendToWordPress?: () => void;
  isGeneratingContent?: boolean;
  isGeneratingImage?: boolean;
  isSendingToWP?: boolean;
  canSendToWordPress?: boolean;
  canGenerateImage?: boolean;
}

const ContentView: React.FC<ContentViewProps> = ({
  title,
  description,
  fullContent,
  keywords = [],
  dateCreated,
  status = 'draft',
  wpSentDate,
  wpPostUrl,
  preview_image_url,
  onClose,
  onDeleteClick,
  onRegenerateClick,
  onGenerateImage,
  onSendToWordPress,
  isGeneratingContent = false,
  isGeneratingImage = false,
  isSendingToWP = false,
  canSendToWordPress = false,
  canGenerateImage = false,
}) => {
  const contentToDisplay = fullContent || description || '';
  
  const hasContent = !!(fullContent || description);

  const formattedWpSentDate = wpSentDate ? new Date(wpSentDate).toLocaleString() : null;

  // Determine if we should show WordPress link
  const shouldShowWpLink = wpSentDate && (wpPostUrl || status === 'published');
  
  // Determine if the content has already been sent to WordPress
  const alreadySentToWP = status === 'published' && !!wpSentDate;

  return (
    <Sheet open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetPortal>
        <SheetOverlay onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" 
             onClick={(e) => {
               e.stopPropagation();
               onClose();
             }}>
          <Card 
            className="w-full max-w-4xl h-[85vh] flex flex-col shadow-lg animate-in fade-in zoom-in duration-300 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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
              <div className="flex items-center justify-end gap-1 shrink-0">
                {/* Regenerate Content Button - Only show when content hasn't been sent to WordPress */}
                {onRegenerateClick && !alreadySentToWP && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={onRegenerateClick}
                    title={isGeneratingContent 
                      ? "Generating content..." 
                      : hasContent 
                        ? "Regenerate with AI" 
                        : "Generate with AI"}
                    disabled={isGeneratingContent}
                  >
                    {isGeneratingContent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : hasContent ? (
                      <RefreshCw className="h-4 w-4" />
                    ) : (
                      <FileEdit className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                {/* Generate Image Button - Only show when content exists and hasn't been sent to WordPress */}
                {onGenerateImage && hasContent && !alreadySentToWP && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={`h-8 w-8 ${
                      preview_image_url
                        ? 'text-purple-800 bg-purple-50 cursor-default'
                        : canGenerateImage
                          ? 'text-purple-600 hover:bg-purple-100 hover:text-purple-700'
                          : 'text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={canGenerateImage ? onGenerateImage : undefined}
                    title={
                      preview_image_url
                        ? "Image already generated"
                        : isGeneratingImage
                          ? "Generating image..."
                          : "Generate image with AI"
                    }
                    disabled={!canGenerateImage || isGeneratingImage || !!preview_image_url}
                  >
                    {isGeneratingImage ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                    ) : preview_image_url ? (
                      <Image className="h-4 w-4 fill-purple-800" />
                    ) : (
                      <Image className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                {/* Send to WordPress Button */}
                {onSendToWordPress && hasContent && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={`h-8 w-8 ${
                      alreadySentToWP
                        ? 'text-emerald-800 bg-emerald-50 cursor-default'
                        : canSendToWordPress
                          ? 'text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700'
                          : 'text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={canSendToWordPress ? onSendToWordPress : undefined}
                    title={
                      alreadySentToWP
                        ? `Already sent to WordPress${wpSentDate ? ` on ${new Date(wpSentDate).toLocaleDateString()}` : ''}`
                        : "Send to WordPress"
                    }
                    disabled={!canSendToWordPress || isSendingToWP}
                  >
                    {isSendingToWP ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    ) : alreadySentToWP ? (
                      <Send className="h-4 w-4 fill-emerald-800" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                {/* Delete Button */}
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
                
                {/* Close Button */}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            
            {/* Meta Information */}
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
            
            <Separator className="my-3 shrink-0" />
            
            {/* Content Area */}
            <div 
              className="overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 flex-1" 
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {hasContent ? (
                <div className="space-y-6">
                  {/* Preview Image */}
                  {(() => {
                    if (preview_image_url) {
                      console.log('Attempting to display image:', preview_image_url);
                      return (
                        <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={preview_image_url} 
                            alt={`Preview image for ${title}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image failed to load:', e);
                              const img = e.target as HTMLImageElement;
                              console.error('Failed URL:', img.src);
                            }}
                            onLoad={() => console.log('Image loaded successfully')}
                          />
                        </div>
                      );
                    } else {
                      console.log('No preview_image_url available');
                      return null;
                    }
                  })()}
                  
                  {/* Content */}
                  <div 
                    className="wordpress-content prose prose-sm md:prose lg:prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: contentToDisplay }} 
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground py-12">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onRegenerateClick();
                        }}
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
                            <FileEdit className="h-3.5 w-3.5 mr-1.5" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* WordPress Integration Footer */}
            {wpSentDate && (
              <div className="px-3 sm:px-4 md:px-6 py-3 bg-emerald-50 text-emerald-700 text-xs shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="h-3 w-3 fill-emerald-700" />
                    <span className="font-medium">
                      Published to WordPress {formattedWpSentDate ? `on ${formattedWpSentDate}` : ''}
                    </span>
                  </div>
                  {shouldShowWpLink && (
                    wpPostUrl ? (
                      <a 
                        href={wpPostUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 transition-colors font-medium"
                        onClick={(e) => e.stopPropagation()}
                        title="View this content in WordPress"
                      >
                        <span>View Post</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <span>Published to WordPress</span>
                        <Send className="h-3 w-3" />
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
            
            {/* Keywords Section */}
            {keywords.length > 0 && (
              <>
                <Separator className="mt-0 mb-3 shrink-0" />
                <div className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6 shrink-0">
                  <h3 className="text-sm font-medium mb-2">Keywords:</h3>
                  <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
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
