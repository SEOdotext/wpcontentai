import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  lastFetched: string;
}

const ContentViewModal: React.FC<ContentViewModalProps> = ({
  isOpen,
  onClose,
  title,
  content,
  lastFetched,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Last analyzed: {new Date(lastFetched).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] mt-4">
          <div className="whitespace-pre-wrap p-4 bg-gray-50 rounded-md">
            {content || 'No content available. Try analyzing the content first.'}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ContentViewModal; 