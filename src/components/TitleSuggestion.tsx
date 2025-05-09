import React, { useState, useCallback, useEffect } from 'react';
import { ThumbsDown, ThumbsUp, Calendar, Minus, Check, RefreshCw, X, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { addDays, format, isAfter, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useSettings } from '@/context/SettingsContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { usePostThemes } from '@/context/PostThemesContext';
import { useWebsites } from '@/context/WebsitesContext';
import { CalendarIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TitleSuggestionProps {
  id: string;
  title: string;
  keywords: string[];
  categories: { id: string; name: string }[];
  selected?: boolean;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
  date: Date;
  onUpdateDate?: (date: Date) => void;
  onLiked?: () => void;
  status: 'pending' | 'approved' | 'published' | 'generated' | 'declined' | 'generatingidea' | 'textgenerated';
  onUpdateKeywords?: (id: string, keywords: string[]) => void;
  onUpdateCategories?: (id: string, categories: { id: string; name: string }[]) => void;
  isGeneratingContent?: boolean;
  image?: { url: string; name: string } | null;
  onSelectImage?: (imageId: string) => void;
}

const TitleSuggestion: React.FC<TitleSuggestionProps> = ({
  id,
  title,
  keywords = [],
  categories = [],
  selected = false,
  onSelect,
  onRemove,
  className,
  date,
  onUpdateDate,
  onLiked,
  status,
  onUpdateKeywords,
  onUpdateCategories,
  isGeneratingContent = false,
  image = null,
  onSelectImage,
}) => {
  const { postThemes, updatePostTheme, deletePostTheme, getNextPublicationDate } = usePostThemes();
  const { currentWebsite } = useWebsites();
  
  // Ensure keywords is always a valid array
  const safeKeywords = Array.isArray(keywords) ? keywords : [];
  
  const [liked, setLiked] = useState(status === 'approved');
  const [disliked, setDisliked] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [displayDate, setDisplayDate] = useState<Date>(date);

  // For pending posts, calculate display date whenever postThemes changes
  useEffect(() => {
    const updateDisplayDate = async () => {
      if (status === 'pending') {
        try {
          const nextDate = await getNextPublicationDate();
          setDisplayDate(nextDate);
        } catch (e) {
          console.error('Error calculating next publication date:', e);
          setDisplayDate(date); // Fallback to prop date
        }
      } else {
        setDisplayDate(date); // Use prop date for non-pending posts
      }
    };

    updateDisplayDate();
  }, [status, postThemes, getNextPublicationDate, date]);
  
  /**
   * Handles the approval (like) action for a title suggestion
   * This function:
   * 1. Updates the post status to 'approved'
   * 2. Uses the current frontend date
   * 3. Notifies the parent component about the approval
   */
  const handleLike = async () => {
    if (liked) return;
    
    try {
      setLiked(true);
      setDisliked(false);
      
      // Always use the current frontend date (displayDate) when approving
      // This preserves any manual date selections the user has made
      console.log('Scheduling post for:', format(displayDate, 'MMM dd, yyyy'));
      
      // Update the post theme with the current frontend date and approved status
      const updated = await updatePostTheme(id, { 
        status: 'approved',
        scheduled_date: displayDate.toISOString()
      }, false);
      
      if (updated) {
        // Show a success toast with the scheduled date
        toast.success(
          `"${title}" has been scheduled for ${format(displayDate, 'MMM dd, yyyy')}`,
          {
            description: "Content added to your calendar"
          }
        );
        
        // Start exit animation
        setIsExiting(true);
        
        // Call onLiked after animation completes
        setTimeout(() => {
          if (onLiked) {
            onLiked();
          }
        }, 300);
      } else {
        setIsExiting(false);
        setLiked(false);
        toast.error("Failed to update post status");
      }
    } catch (error) {
      setIsExiting(false);
      setLiked(false);
      console.error('Error approving content:', error);
      toast.error('An error occurred while approving the content');
    }
  };

  const handleDislike = async () => {
    if (disliked) return;
    
    try {
      setDisliked(true);
      setLiked(false);
      
      // Delete the post theme
      const deleted = await deletePostTheme(id);
      
      if (deleted) {
        toast.info("Content suggestion declined", {
          description: "You can generate new suggestions"
        });
        
        // Call the parent's onRemove handler if provided
        if (onRemove) {
          onRemove(id);
        }
      } else {
        toast.error("Failed to decline post");
      }
    } catch (error) {
      console.error('Error declining content:', error);
      toast.error('An error occurred while declining the content');
    }
  };

  const handleDateSelect = async (selectedDate: Date | undefined) => {
    if (!selectedDate || !onUpdateDate) return;
    
    try {
      // Ensure the date is valid
      if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
        console.error('Invalid date selected:', selectedDate);
        toast.error('Invalid date selected');
        return;
      }
      
      // First call the parent's onUpdateDate handler to trigger parent component update
      onUpdateDate(selectedDate);
      
      // Then update the post theme's scheduled date
      const updated = await updatePostTheme(id, { 
        scheduled_date: selectedDate.toISOString() 
      }, false);
      
      if (updated) {
        toast.success("Publication date updated", {
          description: `Content scheduled for ${format(selectedDate, 'MMM dd, yyyy')}`
        });
      } else {
        toast.error("Failed to update publication date");
      }
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Failed to update publication date');
    }
  };

  const handleRemoveKeyword = (keyword: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Filter out the removed keyword
    const updatedKeywords = safeKeywords.filter(k => k !== keyword);
    
    // Update in the database
    updatePostTheme(id, { keywords: updatedKeywords })
      .then(() => {
        // Only notify parent component about the change after successful update
        if (onUpdateKeywords) {
          onUpdateKeywords(id, updatedKeywords);
        }
        
        toast.success('Keyword removed');
      })
      .catch(error => {
        console.error('Error removing keyword:', error);
        toast.error('Failed to remove keyword');
      });
  };

  const handleAddKeyword = (newKeyword: string) => {
    if (!newKeyword.trim()) return;
    
    // Add the new keyword
    const updatedKeywords = [...safeKeywords, newKeyword.trim()];
    
    // Update in the database
    updatePostTheme(id, { keywords: updatedKeywords })
      .then(() => {
        // Only notify parent component about the change after successful update
        if (onUpdateKeywords) {
          onUpdateKeywords(id, updatedKeywords);
        }
        
        toast.success('Keyword added');
      })
      .catch(error => {
        console.error('Error adding keyword:', error);
        toast.error('Failed to add keyword');
      });
  };

  const handleRemoveCategory = (category: { id: string; name: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Filter out the removed category
    const updatedCategories = categories.filter(c => c.id !== category.id);
    
    // Update in the database
    updatePostTheme(id, { categories: updatedCategories })
      .then(() => {
        // Only notify parent component about the change after successful update
        if (onUpdateCategories) {
          onUpdateCategories(id, updatedCategories);
        }
        
        toast.success('Category removed');
      })
      .catch(error => {
        console.error('Error removing category:', error);
        toast.error('Failed to remove category');
      });
  };

  const handleDeleteImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const success = await updatePostTheme(id, { 
        image_id: null,
        image: null 
      });
      
      if (success) {
        toast.success('Image removed');
      } else {
        toast.error('Failed to remove image');
      }
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    }
  };

  const handleSelectImage = async (imageId: string) => {
    try {
      const success = await updatePostTheme(id, { 
        image_id: imageId
      });
      
      if (success) {
        toast.success('Image selected');
      } else {
        toast.error('Failed to select image');
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      toast.error('Failed to select image');
    }
  };

  // Handle animation end
  const handleTransitionEnd = useCallback(() => {
    if (isExiting && onRemove) {
      onRemove(id);
    }
  }, [isExiting, onRemove, id]);

  // Don't hide approved items until animation completes
  if (status === 'approved' && !isExiting && !liked) {
    return null;
  }

  // Get status badge color
  const getStatusBadge = () => {
    switch (status) {
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'published':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Published</Badge>;
      case 'textgenerated':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Text Generated</Badge>;
      case 'generated':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Generated</Badge>;
      case 'generatingidea':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Generating Idea</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Declined</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    // Validate date before formatting
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date provided to TitleSuggestion:', date);
      return format(addDays(new Date(), 1), 'MMM dd, yyyy');
    }
    return format(date, 'MMM dd, yyyy');
  };

  return (
    <div 
      className={cn(
        'p-4 rounded-lg border transition-all duration-300 ease-in-out hover:shadow-subtle',
        selected 
          ? 'bg-primary/5 border-primary/30 dark:bg-primary/10' 
          : 'bg-card border-border/50',
        isExiting && 'opacity-0 transform translate-x-full pointer-events-none',
        'animate-fade-in',
        className
      )}
      onClick={() => !isExiting && onSelect?.(id)}
      style={{
        transform: isExiting ? 'translateX(100%)' : 'translateX(0)',
        opacity: isExiting ? 0 : 1,
      }}
    >
      <div className="flex gap-4">
        {image && (
          <div className="relative group">
            <img
              src={image.url}
              alt={image.name}
              className="w-16 h-16 object-cover rounded border flex-shrink-0"
              style={{ minWidth: 64, minHeight: 64 }}
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDeleteImage}
              title="Remove image"
            >
              <Trash2 className="h-3 w-3" />
              <span className="sr-only">Remove image</span>
            </Button>
          </div>
        )}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-medium text-base text-balance">{title}</h3>
              <div className="mt-1 flex items-center gap-2">
                {getStatusBadge()}
                <div className="flex flex-wrap gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-wrap gap-1">
                          {categories.map((category) => (
                            <Badge 
                              key={`cat-${category.id}`}
                              variant="secondary"
                              className="bg-secondary/50 text-secondary-foreground"
                            >
                              <span>{category.name}</span>
                              <button
                                onClick={(e) => handleRemoveCategory(category, e)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Categories help organize your content on WordPress</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isGeneratingContent ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Generating content...</span>
                </div>
              ) : (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center text-xs text-muted-foreground h-7 px-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        <span>{formatDate(displayDate)}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={displayDate}
                        onSelect={handleDateSelect}
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
                      liked && "text-green-500"
                    )}
                    onClick={handleLike}
                    disabled={status === 'published'}
                    title={status === 'published' ? 'Already in calendar' : 'Add to calendar'}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span className="sr-only">Like</span>
                  </Button>
                </>
              )}
              
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7", 
                  disliked && "text-red-500"
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
          
          {safeKeywords.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {safeKeywords.map((keyword, index) => (
                      <Badge 
                        key={index}
                        variant="outline" 
                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs flex items-center gap-1 pr-1"
                      >
                        <span>{keyword}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-3 w-3 rounded-full p-0 text-blue-700 hover:bg-blue-200 hover:text-blue-800"
                          onClick={(e) => handleRemoveKeyword(keyword, e)}
                          disabled={status === 'published'}
                        >
                          <X className="h-2 w-2" />
                          <span className="sr-only">Remove keyword</span>
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Keywords help with SEO and content organization</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
};

export default TitleSuggestion;
