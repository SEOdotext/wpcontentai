import { supabase } from '@/integrations/supabase/client';

interface ChatUpdateRequest {
  userMessage: string;
  selectedText?: string;
  platform?: string;
}

interface ChatUpdateResponse {
  success: boolean;
  message?: string;
  updatedContent?: string;
}

export const updateContentWithChat = async (
  postThemeId: string,
  request: ChatUpdateRequest
): Promise<ChatUpdateResponse> => {
  try {
    const response = await fetch(`/api/chat/update/${postThemeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to update content');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in updateContentWithChat:', error);
    return {
      success: false,
      message: 'Failed to update content',
    };
  }
}; 