import React, { useState, useCallback } from 'react';
import { ThumbsDown, ThumbsUp, Calendar, Minus, Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import KeywordBadge, { KeywordDifficulty } from './KeywordBadge';
import { addDays, format, isAfter, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useSettings } from '@/context/SettingsContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { usePostThemes } from '@/context/PostThemesContext';
import { Badge } from '@/components/ui/badge';

export interface Keyword {
  text: string;
  difficulty: KeywordDifficulty;
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
  onLiked?: () => void;
  status?: 'pending' | 'generated' | 'published';
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
}) => {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const { publicationFrequency } = useSettings();
  const { updatePostTheme, deletePostTheme } = usePostThemes();
  
  const addToCalendar = useCallback((title: string, keywords: Keyword[], selectedDate: Date) => {
    try {
      // Get the latest calendar content
      const existingContent = JSON.parse(localStorage.getItem('calendarContent') || '[]');
      
      const publicationDate = selectedDate;
      
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
      
      const updatedContent = [...existingContent, newContent];
      
      // Sort by date
      updatedContent.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Save back to localStorage
      localStorage.setItem('calendarContent', JSON.stringify(updatedContent));
      
      console.log('Added content to calendar:', newContent);
      console.log('Updated calendar content:', updatedContent);
      
      return newContent;
    } catch (error) {
      console.error('Error adding content to calendar:', error);
      return null;
    }
  }, []);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!liked) {
      setLiked(true);
      if (disliked) setDisliked(false);
      
      const newContent = addToCalendar(title, keywords, date);
      if (newContent) {
        // Update the post theme status to 'generated'
        await updatePostTheme(id, { status: 'generated' });
        
        toast.success(
          `"${title}" has been scheduled for ${format(new Date(newContent.date), 'MMM dd, yyyy')}`,
          {
            description: "Content added to your calendar"
          }
        );
        
        if (onLiked) {
          onLiked();
        }
      } else {
        toast.error("Failed to add content to calendar");
      }
    }
  };

  const handleDislike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!disliked) {
      setDisliked(true);
      if (liked) setLiked(false);
      
      // Delete the post theme
      await deletePostTheme(id);
      
      if (onRemove) {
        onRemove();
      }
      
      toast.info("Content suggestion dismissed", {
        description: "You can generate new suggestions"
      });
    }
  };

  const handleDateChange = async (newDate: Date | undefined) => {
    if (newDate && onUpdateDate) {
      // Update the post theme scheduled date
      await updatePostTheme(id, { scheduled_date: newDate.toISOString() });
      onUpdateDate(newDate);
    }
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
              liked || status === 'generated' || status === 'published' 
                ? "text-green-500" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={handleLike}
            disabled={status === 'generated' || status === 'published'}
            title={status === 'generated' || status === 'published' ? 'Already in calendar' : 'Add to calendar'}
          >
            {status === 'generated' || status === 'published' ? (
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
            <KeywordBadge 
              key={index} 
              keyword={keyword.text} 
              difficulty={keyword.difficulty}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TitleSuggestion;
