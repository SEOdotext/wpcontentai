import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface Keyword {
  text: string;
}

export interface ContentCardProps {
  title: string;
  description?: string;
  keywords?: Keyword[];
  dateCreated?: string;
  contentStatus?: 'draft' | 'published' | 'scheduled';
  className?: string;
}

const ContentCard: React.FC<ContentCardProps> = ({
  title,
  description,
  keywords = [],
  dateCreated,
  contentStatus = 'draft',
  className,
}) => {
  return (
    <div 
      className={cn(
        'content-card p-4 animate-scale-in border rounded-md hover:shadow-md transition-all', 
        className
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          {dateCreated && (
            <span className="text-xs text-muted-foreground">
              {dateCreated}
            </span>
          )}
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
