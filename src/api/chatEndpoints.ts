import { supabase } from '@/integrations/supabase/client';

interface ChatUpdateResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export const updateContentWithChat = async (
  postThemeId: string,
  message: string,
  currentContent: string
): Promise<ChatUpdateResponse> => {
  try {
    // Call the Supabase Edge Function for chat-based content updates
    const { data, error } = await supabase.functions.invoke('chat-content-update', {
      body: {
        post_theme_id: postThemeId,
        message,
        current_content: currentContent
      }
    });

    if (error) {
      console.error('Error updating content with chat:', error);
      return {
        success: false,
        error: error.message
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Failed to update content'
      };
    }

    return {
      success: true,
      content: data.content
    };
  } catch (error) {
    console.error('Error in updateContentWithChat:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}; 