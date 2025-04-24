import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Loader2, RefreshCw, X, MessageSquare, Edit2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { updateContentWithChat } from '@/api/chatEndpoints';

interface ContentEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onRegenerate: () => void;
  onSendToWordPress: () => void;
  isGeneratingContent?: boolean;
  isSendingToWP?: boolean;
  canSendToWordPress?: boolean;
  categories?: Array<{ id: string; name: string }>;
  keywords?: Array<string>;
  onUpdateContent: (newContent: string) => void;
  postThemeId?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  selectedText?: string;
  timestamp: number;
}

const ContentEditorDrawer: React.FC<ContentEditorDrawerProps> = ({
  isOpen,
  onClose,
  title,
  content,
  onRegenerate,
  onSendToWordPress,
  isGeneratingContent = false,
  isSendingToWP = false,
  canSendToWordPress = false,
  categories = [],
  keywords = [],
  onUpdateContent,
  postThemeId,
}) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Update edited content when content prop changes
  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      const scrollContainer = chatContainerRef.current;
      // Use setTimeout to ensure the DOM has updated
      setTimeout(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [chatMessages]);

  // Also scroll when processing state changes
  useEffect(() => {
    if (chatContainerRef.current) {
      const scrollContainer = chatContainerRef.current;
      setTimeout(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [isProcessing]);

  const handleSaveEdit = () => {
    onUpdateContent(editedContent);
    setIsEditing(false);
    toast.success('Content saved successfully');
  };

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);
      // Auto-fill the chat input with the selected text
      setUserInput(`Rewrite this part: "${text}"`);
    } else {
      setSelectedText('');
    }
  };

  const addMessage = (message: Omit<ChatMessage, 'timestamp'>) => {
    setChatMessages(prev => [...prev, { ...message, timestamp: Date.now() }]);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing || !postThemeId) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: userInput.trim(),
      selectedText: selectedText || undefined,
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setSelectedText('');
    setIsProcessing(true);

    try {
      // Add a processing message
      addMessage({
        role: 'assistant',
        content: 'Processing your request...',
      });

      const response = await updateContentWithChat(postThemeId, userMessage.content, content);
      
      // Remove the processing message
      setChatMessages(prev => prev.slice(0, -1));
      
      if (response.success && response.content) {
        // Update the content
        onUpdateContent(response.content);
        
        // Add assistant's response to chat with contextual message
        const userMessage = userInput.toLowerCase();
        let responseMessage = '';
        
        if (userMessage.includes('rewrite')) {
          responseMessage = 'I\'ve rewritten the selected text to better match your requirements. The changes are now visible in the preview.';
        } else if (userMessage.includes('add') || userMessage.includes('include')) {
          responseMessage = 'I\'ve added the requested content to the article. You can see the additions in the preview.';
        } else if (userMessage.includes('remove') || userMessage.includes('delete')) {
          responseMessage = 'I\'ve removed the specified content as requested. The changes are reflected in the preview.';
        } else if (userMessage.includes('improve') || userMessage.includes('enhance')) {
          responseMessage = 'I\'ve enhanced the content to make it more engaging and informative. Check out the improvements in the preview.';
        } else if (userMessage.includes('fix') || userMessage.includes('correct')) {
          responseMessage = 'I\'ve corrected the issues you mentioned. The content should now be more accurate and polished.';
        } else {
          responseMessage = 'I\'ve updated the content based on your request. The changes are now visible in the preview.';
        }

        addMessage({
          role: 'assistant',
          content: responseMessage,
        });

        // Show success toast
        toast.success('Content updated successfully');
      } else {
        throw new Error(response.error || 'Failed to update content');
      }
    } catch (error) {
      console.error('Error processing chat message:', error);
      
      // Remove the processing message
      setChatMessages(prev => prev.slice(0, -1));
      
      // Add error message to chat
      addMessage({
        role: 'error',
        content: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
      });

      // Show error toast
      toast.error('Failed to process your request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-[95%] max-w-6xl bg-background border-l shadow-lg transform transition-transform duration-300 ease-in-out z-50',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(!isEditing)}
                title={isEditing ? "Preview" : "Edit"}
              >
                {isEditing ? <Eye className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRegenerate}
                disabled={isGeneratingContent}
              >
                {isGeneratingContent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSendToWordPress}
                disabled={!canSendToWordPress || isSendingToWP}
              >
                {isSendingToWP ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Content Preview/Edit */}
            <div className="w-[70%] border-r p-4 overflow-auto">
              {isEditing ? (
                <div className="h-full flex flex-col">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="flex-1 min-h-[500px] font-mono text-sm"
                  />
                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleSaveEdit}>Save Changes</Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div
                    ref={contentRef}
                    className="prose max-w-none select-text"
                    dangerouslySetInnerHTML={{ __html: content }}
                    onMouseUp={handleTextSelection}
                    onKeyUp={handleTextSelection}
                  />
                </ScrollArea>
              )}
            </div>

            {/* Chat Interface */}
            <div className="w-[30%] flex flex-col">
              <div className="flex-1 overflow-hidden">
                <div 
                  ref={chatContainerRef} 
                  className="h-full p-4 overflow-y-auto"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {chatMessages.map((message, index) => (
                    <div
                      key={`${message.timestamp}-${index}`}
                      className={cn(
                        'mb-4 p-3 rounded-lg',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto max-w-[90%]'
                          : message.role === 'error'
                          ? 'bg-destructive/10 text-destructive max-w-[90%]'
                          : 'bg-muted max-w-[90%]'
                      )}
                    >
                      {message.selectedText && (
                        <div className="mb-2 p-2 bg-primary/20 rounded text-sm">
                          <span className="font-medium">Selected text:</span>
                          <p className="mt-1 italic">{message.selectedText}</p>
                        </div>
                      )}
                      {message.content}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedText ? "Type your message about the selected text..." : "Type your message here..."}
                    className="flex-1 min-h-[120px] resize-y"
                    rows={5}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!userInput.trim() || isProcessing || !postThemeId}
                    className="self-end"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category.id}
                  className="px-2 py-1 text-xs rounded-full bg-muted"
                >
                  {category.name}
                </span>
              ))}
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs rounded-full bg-muted"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContentEditorDrawer; 