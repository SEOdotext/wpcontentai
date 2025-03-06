
import React, { useState } from 'react';
import { Check, Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import KeywordBadge, { KeywordDifficulty } from './KeywordBadge';

export interface Keyword {
  text: string;
  difficulty: KeywordDifficulty;
}

interface TitleSuggestionProps {
  title: string;
  keywords?: Keyword[];
  keywordUsage?: number;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

const TitleSuggestion: React.FC<TitleSuggestionProps> = ({
  title,
  keywords = [],
  keywordUsage = 0,
  selected = false,
  onSelect,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(title);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    if (disliked) setDisliked(false);
    console.log(`Title "${title}" ${!liked ? 'liked' : 'like removed'}`);
  };

  const handleDislike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDisliked(!disliked);
    if (liked) setLiked(false);
    console.log(`Title "${title}" ${!disliked ? 'disliked' : 'dislike removed'}`);
  };

  const getUsageColor = () => {
    if (keywordUsage >= 80) return "text-green-600 dark:text-green-400";
    if (keywordUsage >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div 
      className={cn(
        'p-4 rounded-lg border transition-all cursor-pointer hover:shadow-subtle',
        selected 
          ? 'bg-primary/5 border-primary/30 dark:bg-primary/10' 
          : 'bg-card border-border/50',
        'animate-fade-in',
        className
      )}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Button 
            size="icon" 
            variant={selected ? "default" : "outline"}
            className={cn("h-5 w-5 rounded-full", 
              selected ? "bg-primary" : "bg-transparent"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelect) onSelect();
            }}
          >
            {selected && <Check className="h-3 w-3" />}
            <span className="sr-only">Select title</span>
          </Button>
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            getUsageColor()
          )}>
            {keywordUsage}% keywords
          </span>
        </div>
        
        <div className="flex items-center gap-1">
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
          
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">Copy</span>
          </Button>
        </div>
      </div>
      
      <h3 className="font-medium text-base mb-3 text-balance">{title}</h3>
      
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
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
