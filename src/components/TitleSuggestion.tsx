import React, { useState, useCallback } from 'react';
import { ThumbsDown, ThumbsUp, Calendar, Minus, Check, RefreshCw, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { addDays, format, isAfter, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useSettings } from '@/context/SettingsContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { usePostThemes } from '@/context/PostThemesContext';
import { useWebsites } from '@/context/WebsitesContext';
import { CalendarIcon } from 'lucide-react';

interface TitleSuggestionProps {
  id: string;
  title: string;
  keywords: string[];
  selected?: boolean;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
  date: Date;
  onUpdateDate?: (id: string, date: Date) => void;
  onLiked?: () => void;
  status: 'pending' | 'generated' | 'published';
  onUpdateKeywords?: (id: string, keywords: string[]) => void;
  isGeneratingContent?: boolean;
}

const TitleSuggestion: React.FC<TitleSuggestionProps> = ({
  id,
  title,
  keywords,
  selected = false,
  onSelect,
  onRemove,
  className,
  date,
  onUpdateDate,
  onLiked,
  status,
  onUpdateKeywords,
  isGeneratingContent = false,
}) => {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const { publicationFrequency } = useSettings();
  const { postThemes, updatePostTheme, deletePostTheme, getNextPublicationDate } = usePostThemes();
  const { currentWebsite } = useWebsites();
  
  /**
   * Handles the approval (like) action for a title suggestion
   * This function:
   * 1. Updates the post status to 'generated'
   * 2. Sets the proper scheduled date
   * 3. Notifies the parent component about the approval
   */
  const handleLike = async () => {
    if (liked) return;
    
    try {
      setLiked(true);
      setDisliked(false);
      
      // Calculate a publication date based on the website's publication frequency
      const nextPublicationDate = getNextPublicationDate();
      
      // Check if the user has manually set a custom date using the date picker
      const isCustomDate = date.getTime() !== new Date().getTime();
      
      // Determine which date to use:
      // - If the user selected a custom date, use that
      // - Otherwise, use the calculated date based on publication frequency
      const scheduledDate = isCustomDate ? date : nextPublicationDate;
      
      console.log('Scheduling post for:', format(scheduledDate, 'MMM dd, yyyy'));
      
      // Update the post theme with the scheduled date and status
      const updated = await updatePostTheme(id, { 
        status: 'generated',
        scheduled_date: scheduledDate.toISOString()
      }, false);
      
      if (updated) {
        // Show a success toast with the scheduled date
        toast.success(
          `"${title}" has been scheduled for ${format(scheduledDate, 'MMM dd, yyyy')}`,
          {
            description: "Content added to your calendar"
          }
        );
        
        // Call the parent's onLiked handler if provided
        if (onLiked) {
          onLiked();
        }
      } else {
        toast.error("Failed to update post status");
      }
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error('An error occurred while approving the content');
    }
  };

  const handleDislike = async () => {
    if (disliked) return;
    
    try {
      setDisliked(true);
      setLiked(false);
      
      // Delete the post theme
      const deleted = await deletePostTheme(id);
      
      if (deleted) {
        toast.info("Content suggestion declined", {
          description: "You can generate new suggestions"
        });
        
        // Call the parent's onRemove handler if provided
        if (onRemove) {
          onRemove(id);
        }
      } else {
        toast.error("Failed to decline post");
      }
    } catch (error) {
      console.error('Error declining content:', error);
      toast.error('An error occurred while declining the content');
    }
  };

  const handleDateSelect = async (selectedDate: Date | undefined) => {
    if (!selectedDate || !onUpdateDate) return;
    
    try {
      // Update the post theme's scheduled date
      const updated = await updatePostTheme(id, { 
        scheduled_date: selectedDate.toISOString() 
      }, false);
      
      if (updated) {
        // Call the parent's onUpdateDate handler
        onUpdateDate(id, selectedDate);
        
        toast.success("Publication date updated", {
          description: `Content scheduled for ${format(selectedDate, 'MMM dd, yyyy')}`
        });
      } else {
        toast.error("Failed to update publication date");
      }
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Failed to update publication date');
    }
  };

  const handleRemoveKeyword = (keyword: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Filter out the removed keyword
    const updatedKeywords = keywords.filter(k => k !== keyword);
    
    // Update in the database
    updatePostTheme(id, { keywords: updatedKeywords })
      .then(() => {
        // Only notify parent component about the change after successful update
        if (onUpdateKeywords) {
          onUpdateKeywords(id, updatedKeywords);
        }
        
        toast.success('Keyword removed');
      })
      .catch(error => {
        console.error('Error removing keyword:', error);
        toast.error('Failed to remove keyword');
      });
  };

  const handleAddKeyword = (newKeyword: string) => {
    if (!newKeyword.trim()) return;
    
    // Add the new keyword
    const updatedKeywords = [...keywords, newKeyword.trim()];
    
    // Update in the database
    updatePostTheme(id, { keywords: updatedKeywords })
      .then(() => {
        // Only notify parent component about the change after successful update
        if (onUpdateKeywords) {
          onUpdateKeywords(id, updatedKeywords);
        }
        
        toast.success('Keyword added');
      })
      .catch(error => {
        console.error('Error adding keyword:', error);
        toast.error('Failed to add keyword');
      });
  };

  // Get status badge color
  const getStatusBadge = () => {
    switch (status) {
      case 'generated':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Generated</Badge>;
      case 'published':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Published</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    }
  };

  return (
    <div 
      className={cn(
        'p-4 rounded-lg border transition-all hover:shadow-subtle',
        selected 
          ? 'bg-primary/5 border-primary/30 dark:bg-primary/10' 
          : 'bg-card border-border/50',
        'animate-fade-in',
        className
      )}
      onClick={() => onSelect?.(id)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-base text-balance">{title}</h3>
          <div className="mt-1">
            {getStatusBadge()}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isGeneratingContent ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Generating content...</span>
            </div>
          ) : (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center text-xs text-muted-foreground h-7 px-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    <span>{format(date, 'MMM dd, yyyy')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7", 
                  liked && "text-green-500"
                )}
                onClick={handleLike}
                disabled={status === 'published'}
                title={status === 'published' ? 'Already in calendar' : 'Add to calendar'}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span className="sr-only">Like</span>
              </Button>
            </>
          )}
          
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-7 w-7", 
              disliked && "text-red-500"
            )}
            onClick={handleDislike}
            disabled={status === 'published'}
            title={status === 'published' ? 'Cannot remove published content' : 'Remove suggestion'}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            <span className="sr-only">Dislike</span>
          </Button>
        </div>
      </div>
      
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {keywords.map((keyword, index) => (
            <Badge 
              key={index}
              variant="outline" 
              className="bg-blue-50 text-blue-700 border-blue-200 text-xs flex items-center gap-1 pr-1"
            >
              <span>{keyword}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-3 w-3 rounded-full p-0 text-blue-700 hover:bg-blue-200 hover:text-blue-800"
                onClick={(e) => handleRemoveKeyword(keyword, e)}
                disabled={status === 'published'}
              >
                <X className="h-2 w-2" />
                <span className="sr-only">Remove keyword</span>
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default TitleSuggestion;
