
import React, { useState, useCallback } from 'react';
import { ThumbsDown, ThumbsUp, Calendar, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import KeywordBadge, { KeywordDifficulty } from './KeywordBadge';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import { useSettings } from '@/context/SettingsContext';

export interface Keyword {
  text: string;
  difficulty: KeywordDifficulty;
}

interface TitleSuggestionProps {
  title: string;
  keywords?: Keyword[];
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  className?: string;
}

const TitleSuggestion: React.FC<TitleSuggestionProps> = ({
  title,
  keywords = [],
  selected = false,
  onSelect,
  onRemove,
  className,
}) => {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const { publicationFrequency } = useSettings();
  
  const proposedDate = useCallback(() => {
    const existingContent = JSON.parse(localStorage.getItem('calendarContent') || '[]');
    
    if (existingContent.length === 0) {
      return addDays(new Date(), publicationFrequency);
    } else {
      const sortedContent = [...existingContent].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // If we have content in the array, use the last date
      if (sortedContent.length > 0) {
        return addDays(new Date(sortedContent[0].date), publicationFrequency);
      } else {
        return addDays(new Date(), publicationFrequency);
      }
    }
  }, [publicationFrequency]);
  
  const addToCalendar = useCallback((title: string, keywords: Keyword[]) => {
    try {
      const existingContent = JSON.parse(localStorage.getItem('calendarContent') || '[]');
      
      const publicationDate = proposedDate();
      
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
      
      localStorage.setItem('calendarContent', JSON.stringify([...existingContent, newContent]));
      console.log('Added content to calendar:', newContent);
      console.log('Current calendar content:', JSON.parse(localStorage.getItem('calendarContent') || '[]'));
      
      return newContent;
    } catch (error) {
      console.error('Error adding content to calendar:', error);
      return null;
    }
  }, [proposedDate]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!liked) {
      setLiked(true);
      if (disliked) setDisliked(false);
      
      const newContent = addToCalendar(title, keywords);
      if (newContent) {
        toast.success(
          `"${title}" has been scheduled for ${format(new Date(newContent.date), 'MMM dd, yyyy')}`,
          {
            description: "Content added to your calendar"
          }
        );
        
        if (onRemove) {
          setTimeout(onRemove, 300);
        }
      } else {
        toast.error("Failed to add content to calendar");
      }
    }
  };

  const handleDislike = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!disliked) {
      setDisliked(true);
      if (liked) setLiked(false);
      
      if (onRemove) {
        setTimeout(onRemove, 300);
      }
      
      toast.info("Content suggestion dismissed", {
        description: "You can generate new suggestions"
      });
    }
  };

  const formattedProposedDate = format(proposedDate(), 'MMM dd, yyyy');

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
        <h3 className="font-medium text-base text-balance">{title}</h3>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            <span>{formattedProposedDate}</span>
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-7 w-7", 
              liked ? "text-green-500" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={handleLike}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
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
