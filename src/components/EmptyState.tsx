
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed animate-fade-in',
      className
    )}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary mb-4">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      
      {description && (
        <p className="text-muted-foreground mb-4 max-w-md">{description}</p>
      )}
      
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
};

export default EmptyState;
