import React, { useState, useCallback } from 'react';
import { ThumbsDown, ThumbsUp, Calendar, Minus, Check, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { addDays, format, isAfter, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useSettings } from '@/context/SettingsContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { usePostThemes } from '@/context/PostThemesContext';

// Simplified keyword interface - just text, no difficulty
export interface Keyword {
  text: string;
}

interface TitleSuggestionProps {
  id: string;
  title: string;
  keywords?: Keyword[];
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  className?: string;
  date?: Date;
  onUpdateDate?: (date: Date) => void;
  onLiked?: (date?: Date) => void;
  status?: 'pending' | 'approved' | 'published' | 'declined';
  onUpdateKeywords?: (keywords: string[]) => void;
}

const TitleSuggestion: React.FC<TitleSuggestionProps> = ({
  id,
  title,
  keywords = [],
  selected = false,
  onSelect,
  onRemove,
  className,
  date = new Date(),
  onUpdateDate,
  onLiked,
  status = 'pending',
  onUpdateKeywords,
}) => {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const { publicationFrequency } = useSettings();
  const { updatePostTheme, deletePostTheme } = usePostThemes();
  
  // Function to get the next publication date
  const getNextPublicationDate = useCallback(() => {
    try {
      // Get calendar content from localStorage
      const calendarContent = JSON.parse(localStorage.getItem('calendarContent') || '[]');
      
      if (!calendarContent || calendarContent.length === 0) {
        // If no calendar content, use today + publication frequency
        const result = addDays(new Date(), publicationFrequency);
        console.log('No calendar content, using today + frequency:', format(result, 'yyyy-MM-dd'));
        return result;
      }
      
      // Find the absolute latest date through a simple loop
      let latestTimestamp = 0;
      let latestDateString = '';
      
      for (const item of calendarContent) {
        if (!item.date) continue;
        
        try {
          const dateObj = new Date(item.date);
          const timestamp = dateObj.getTime();
          
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            latestDateString = item.date;
          }
        } catch (e) {
          console.error('Error parsing date:', item.date, e);
        }
      }
      
      if (latestTimestamp === 0) {
        // No valid dates found, use today + publication frequency
        const result = addDays(new Date(), publicationFrequency);
        console.log('No valid dates found, using today + frequency:', format(result, 'yyyy-MM-dd'));
        return result;
      }
      
      // We found a valid latest date, add publication frequency to it
      const latestDate = new Date(latestTimestamp);
      console.log('Found latest calendar date:', format(latestDate, 'yyyy-MM-dd'));
      
      const result = addDays(latestDate, publicationFrequency);
      console.log('Next publication date:', format(result, 'yyyy-MM-dd'));
      return result;
    } catch (error) {
      console.error('Error in getNextPublicationDate:', error);
      // Fallback to today + publication frequency
      return addDays(new Date(), publicationFrequency);
    }
  }, [publicationFrequency]);
  
  /**
   * Adds a post to the content calendar
   * The calendar is stored in localStorage and represents the scheduled content
   * 
   * @param title The title of the post
   * @param keywords Keywords/tags associated with the post
   * @param selectedDate The date when the post should be published
   * @returns The newly created calendar entry or null if an error occurred
   */
  const addToCalendar = useCallback((title: string, keywords: Keyword[], selectedDate: Date) => {
    try {
      // Get the existing calendar content from localStorage
      const existingContent = JSON.parse(localStorage.getItem('calendarContent') || '[]');
      
      // The publication date comes from either:
      // 1. A date manually selected by the user from the date picker
      // 2. The calculated date from getNextPublicationDate()
      const publicationDate = selectedDate;
      
      // Create a new calendar entry
      const newContent = {
        id: Date.now(),
        title,
        description: `Generated content for: ${title}`,
        dateCreated: new Date().toISOString(),
        date: publicationDate.toISOString(),
        status: 'scheduled',
        keywords,
        isFavorite: false,
      };
      
      // Add the new entry to the existing calendar
      const updatedContent = [...existingContent, newContent];
      
      // Sort entries by date
      updatedContent.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Save the updated calendar back to localStorage
      localStorage.setItem('calendarContent', JSON.stringify(updatedContent));
      
      console.log('Added content to calendar:', newContent);
      console.log('Updated calendar content:', updatedContent);
      
      return newContent;
    } catch (error) {
      console.error('Error adding content to calendar:', error);
      return null;
    }
  }, []);

  /**
   * Handles the approval (like) action for a title suggestion
   * This function:
   * 1. Adds the post to the calendar
   * 2. Updates the post status to 'approved'
   * 3. Sets the proper scheduled date
   * 4. Notifies the parent component about the approval
   * 
   * @param e Mouse event
   */
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!liked) {
      setLiked(true);
      if (disliked) setDisliked(false);
      
      try {
        // Calculate a publication date based on the website's publication frequency
        // This adds X days to today's date (where X is the publication frequency)
        const nextPublicationDate = getNextPublicationDate();
        
        // Check if the user has manually set a custom date using the date picker
        // If they have, we'll respect that choice instead of using the calculated date
        const isCustomDate = date.getTime() !== new Date().getTime();
        
        // Determine which date to use:
        // - If the user selected a custom date, use that
        // - Otherwise, use the calculated date based on publication frequency
        const scheduledDate = isCustomDate ? date : nextPublicationDate;
        
        console.log('Scheduling post for:', format(scheduledDate, 'MMM dd, yyyy'));
        
        // Add the post to the calendar (stored in localStorage)
        const newContent = addToCalendar(title, keywords, scheduledDate);
        if (newContent) {
          // Update the database with the approved status and scheduled date
          const updated = await updatePostTheme(id, { 
            status: 'approved',
            scheduled_date: scheduledDate.toISOString()
          });
          
          if (updated) {
            // Show a success toast with the scheduled date
            toast.success(
              `"${title}" has been scheduled for ${format(scheduledDate, 'MMM dd, yyyy')}`,
              {
                description: "Content added to your calendar"
              }
            );
            
            // Notify the parent component about the successful approval
            // This will trigger handleTitleLiked in ContentStructureView
            // which will update other pending posts' dates
            if (onLiked) {
              onLiked(scheduledDate);
            }
          } else {
            toast.error("Failed to update post status");
          }
        } else {
          toast.error("Failed to add content to calendar");
        }
      } catch (error) {
        console.error('Error approving content:', error);
        toast.error('An error occurred while approving the content');
      }
    }
  };

  const handleDislike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!disliked) {
      setDisliked(true);
      if (liked) setLiked(false);
      
      try {
        // Update the post theme status to 'declined' instead of deleting it
        // Also clear the scheduled date
        const updated = await updatePostTheme(id, { 
          status: 'declined', 
          scheduled_date: null 
        });
        
        if (updated) {
          toast.info("Content suggestion declined", {
            description: "You can generate new suggestions"
          });
          
          // Only call onRemove after successful update
          if (onRemove) {
            onRemove();
          }
        } else {
          toast.error("Failed to decline post");
        }
      } catch (error) {
        console.error('Error declining content:', error);
        toast.error('An error occurred while declining the content');
      }
    }
  };

  const handleDateChange = async (newDate: Date | undefined) => {
    if (newDate && onUpdateDate) {
      // Update the post theme scheduled date
      await updatePostTheme(id, { scheduled_date: newDate.toISOString() });
      onUpdateDate(newDate);
    }
  };

  const handleRemoveKeyword = useCallback((keywordText: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the selection
    
    // Prevent removal if published
    if (status === 'published') {
      toast.error("Can't modify keywords for published content");
      return;
    }
    
    // Filter out the removed keyword
    const updatedKeywords = keywords.filter(k => k.text !== keywordText);
    
    // Update in the database
    updatePostTheme(id, { keywords: updatedKeywords.map(k => k.text) })
      .then(() => {
        // Only notify parent component about the change after successful update
        if (onUpdateKeywords) {
          // Pass only the string values directly
          onUpdateKeywords(updatedKeywords.map(k => k.text));
        }
        
        toast.success(`Removed keyword: ${keywordText}`);
      })
      .catch(error => {
        console.error('Error removing keyword:', error);
        toast.error('Failed to remove keyword. Please try again.');
      });
  }, [id, keywords, status, onUpdateKeywords, updatePostTheme]);

  // Get status badge color
  const getStatusBadge = () => {
    switch (status) {
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'published':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Published</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Declined</Badge>;
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
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-base text-balance">{title}</h3>
          <div className="mt-1">
            {getStatusBadge()}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center text-xs text-muted-foreground h-7 px-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Calendar className="h-3 w-3 mr-1" />
                <span>{format(date, 'MMM dd, yyyy')}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={handleDateChange}
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
              liked || status === 'approved' || status === 'published' 
                ? "text-green-500" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={handleLike}
            disabled={status === 'approved' || status === 'published'}
            title={status === 'approved' || status === 'published' ? 'Already in calendar' : 'Add to calendar'}
          >
            {status === 'approved' || status === 'published' ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <ThumbsUp className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">Like</span>
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-7 w-7", 
              disliked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
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
              <span>{keyword.text}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-3 w-3 rounded-full p-0 text-blue-700 hover:bg-blue-200 hover:text-blue-800"
                onClick={(e) => handleRemoveKeyword(keyword.text, e)}
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
