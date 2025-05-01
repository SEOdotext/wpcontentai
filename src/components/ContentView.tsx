import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, RefreshCw, Tag, Trash, X, Send, FileEdit, Loader2, ExternalLink, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Keyword } from './ContentCard';
import { format, parseISO } from 'date-fns';
import ContentEditorDrawer from './ContentEditorDrawer';

// Define a proper keyword type that supports both string and object formats
interface KeywordType {
  text: string;
}

// Define a proper category type
interface Category {
  id: string;
  name: string;
}

// Type guard function to check if an object is a Category
function isCategory(obj: any): obj is Category {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj;
}

// Type guard function to check if an object is a KeywordType
function isKeywordType(obj: any): obj is KeywordType {
  return typeof obj === 'object' && obj !== null && 'text' in obj;
}

interface ContentViewProps {
  postThemeId: string;
  title: string;
  description?: string;
  fullContent?: string;
  keywords?: Array<KeywordType | string>;
  categories?: Array<Category | string>;
  dateCreated?: string;
  status?: 'draft' | 'published' | 'scheduled' | 'content-ready';
  wpSentDate?: string;
  wpPostUrl?: string;
  preview_image_url?: string;
  onClose: () => void;
  onDeleteClick?: () => void;
  onRegenerateClick?: () => void;
  onGenerateImage?: () => void;
  onDeleteImage?: () => void;
  onSendToWordPress?: () => void;
  onGenerateAndPublish?: () => void;
  isGeneratingContent?: boolean;
  isGeneratingImage?: boolean;
  isSendingToWP?: boolean;
  isGeneratingAndPublishing?: boolean;
  canSendToWordPress?: boolean;
  canGenerateImage?: boolean;
}

const ContentView: React.FC<ContentViewProps> = ({
  postThemeId,
  title,
  description,
  fullContent,
  keywords = [],
  categories = [],
  dateCreated,
  status = 'draft',
  wpSentDate,
  wpPostUrl,
  preview_image_url,
  onClose,
  onDeleteClick,
  onRegenerateClick,
  onGenerateImage,
  onDeleteImage,
  onSendToWordPress,
  onGenerateAndPublish,
  isGeneratingContent = false,
  isGeneratingImage = false,
  isSendingToWP = false,
  isGeneratingAndPublishing = false,
  canSendToWordPress = false,
  canGenerateImage = false,
}) => {
  const [content, setContent] = useState(fullContent || description || '');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const hasContent = !!content;
  const formattedWpSentDate = wpSentDate ? new Date(wpSentDate).toLocaleString() : null;
  const shouldShowWpLink = wpPostUrl;
  const alreadySentToWP = status === 'published' && !!wpSentDate;
  const safeKeywords = Array.isArray(keywords) ? keywords : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  // Update content when fullContent or description changes
  React.useEffect(() => {
    setContent(fullContent || description || '');
  }, [fullContent, description]);

  // Add effect to handle content updates
  React.useEffect(() => {
    if (isGeneratingContent) {
      console.log('Content generation in progress...');
    } else if (hasContent) {
      console.log('Content generation complete, displaying new content');
    }
  }, [isGeneratingContent, hasContent]);

  // Handle drawer close
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    onClose();
  };

  return (
    <ContentEditorDrawer
      isOpen={isDrawerOpen}
      onClose={handleDrawerClose}
      title={title}
      content={content}
      onRegenerate={onRegenerateClick || (() => {})}
      onSendToWordPress={onSendToWordPress || (() => {})}
      isGeneratingContent={isGeneratingContent}
      isSendingToWP={isSendingToWP}
      canSendToWordPress={canSendToWordPress}
      categories={safeCategories.map(cat => typeof cat === 'string' ? { id: cat, name: cat } : cat)}
      keywords={safeKeywords.map(kw => typeof kw === 'string' ? kw : kw.text)}
      onUpdateContent={(newContent) => {
        setContent(newContent);
        console.log('Content updated:', newContent);
      }}
      postThemeId={postThemeId}
      wp_post_url={wpPostUrl}
      preview_image_url={preview_image_url}
      onRegenerateImage={onGenerateImage}
      onDeleteImage={onDeleteImage}
      isGeneratingImage={isGeneratingImage}
      onGenerateAndPublish={onGenerateAndPublish}
      isGeneratingAndPublishing={isGeneratingAndPublishing}
    />
  );
};

export default ContentView;
