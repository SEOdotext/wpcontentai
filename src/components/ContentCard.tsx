import React from 'react';
import { MoreHorizontal, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Keyword {
  text: string;
}

export interface ContentCardProps {
  title: string;
  description?: string;
  keywords?: Keyword[];
  dateCreated?: string;
  contentStatus?: 'draft' | 'published' | 'scheduled';
  onClick?: () => void;
  onEditClick?: () => void;
  onDuplicateClick?: () => void;
  onDeleteClick?: () => void;
  className?: string;
}

const ContentCard: React.FC<ContentCardProps> = ({
  title,
  description,
  keywords = [],
  dateCreated,
  contentStatus = 'draft',
  onClick,
  onEditClick,
  onDuplicateClick,
  onDeleteClick,
  className,
}) => {
  return (
    <div 
      className={cn(
        'content-card p-4 cursor-pointer animate-scale-in border rounded-md hover:shadow-md transition-all', 
        className
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          {dateCreated && (
            <span className="text-xs text-muted-foreground">
              {dateCreated}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick?.();
            }}
          >
            <Minus className="h-4 w-4" />
            <span className="sr-only">Remove from calendar</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEditClick?.();
              }}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onDuplicateClick?.();
              }}>
                Duplicate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <h3 className="font-medium text-base mb-1 text-balance">{title}</h3>
      
      {description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>
      )}
      
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {keywords.map((keyword, index) => (
            <Badge 
              key={index}
              variant="outline" 
              className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
            >
              {keyword.text}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentCard;
