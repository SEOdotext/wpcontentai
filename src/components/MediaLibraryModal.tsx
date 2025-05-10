import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (image: { id: string; url: string; name: string; description?: string }) => void;
  websiteId: string;
}

interface Image {
  id: string;
  url: string;
  name: string;
  description?: string;
}

const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  websiteId,
}) => {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Reset selected image when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedImageId(null);
    }
  }, [isOpen]);

  // Fetch images when modal opens
  useEffect(() => {
    if (isOpen && websiteId) {
      fetchImages();
    }
  }, [isOpen, websiteId]);

  const fetchImages = async () => {
    if (!websiteId) return;
    
    setIsLoading(true);
    try {
      const { data: images, error } = await supabase
        .from('images')
        .select('id, url, name, description')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(images || []);
    } catch (error) {
      console.error('Error fetching media library:', error);
      toast.error('Failed to load media library');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (imageId: string) => {
    setSelectedImageId(imageId);
  };

  const handleConfirmSelection = () => {
    if (selectedImageId) {
      const selectedImage = images.find(img => img.id === selectedImageId);
      if (selectedImage) {
        onSelectImage(selectedImage);
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select an image from your media library</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {isLoading ? (
              <div className="col-span-full flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : images.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No images found in your media library
              </div>
            ) : (
              images.map((image) => (
                <div
                  key={image.id}
                  className={cn(
                    "relative aspect-video rounded-lg overflow-hidden cursor-pointer group",
                    selectedImageId === image.id 
                      ? "ring-2 ring-primary" 
                      : "hover:ring-2 hover:ring-primary"
                  )}
                  onClick={() => handleImageSelect(image.id)}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <h4 className="text-white text-sm font-medium truncate">
                      {image.name}
                    </h4>
                    {image.description && (
                      <p className="text-white/80 text-xs truncate">
                        {image.description}
                      </p>
                    )}
                  </div>
                  {selectedImageId === image.id && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSelection}
            disabled={!selectedImageId}
          >
            Select Image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaLibraryModal; 