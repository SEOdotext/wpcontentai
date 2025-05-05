import { supabase } from '@/integrations/supabase/client';

interface ChatUpdateRequest {
  userMessage: string;
  selectedText?: string;
  platform?: string;
  platformSettings?: any;
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
    // Get current session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) {
      throw new Error('No active session found');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-content-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        post_theme_id: postThemeId,
        message: request.userMessage,
        current_content: request.selectedText || '',
        platform: request.platform,
        platform_settings: request.platformSettings
      }),
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