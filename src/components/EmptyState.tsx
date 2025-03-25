import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 mb-4">{description}</p>
      {actionLabel && onAction && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onAction} variant="default">
                {actionLabel}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" sideOffset={5}>
              Click to {actionLabel.toLowerCase()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default EmptyState;
