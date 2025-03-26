import { supabase } from '@/integrations/supabase/client';

export interface GenerateImageParams {
  content: string;
  postId: string;
  websiteId: string;
}

export async function generateImage({ content, postId, websiteId }: GenerateImageParams) {
  try {
    console.log('Starting image generation with params:', { content, postId, websiteId });

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    // Get the Supabase URL from the client config
    const supabaseUrl = (supabase as any).supabaseUrl;
    // Use image-trigger instead of generate-image since it has CORS properly configured
    const functionUrl = `${supabaseUrl}/functions/v1/image-trigger`;
    console.log('Calling Edge Function at:', functionUrl);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ postId, websiteId }),
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response text:', responseText);

    if (!response.ok) {
      throw new Error(`Edge Function returned ${response.status}: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      throw new Error('Invalid JSON response from Edge Function');
    }

    console.log('Edge Function response:', data);
    console.log('Image URL from response:', data.imageUrl);

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate image');
    }

    // Validate the image URL
    if (!data.imageUrl) {
      throw new Error('No image URL returned from Edge Function');
    }

    return data;
  } catch (error) {
    console.error('Error in generateImage service:', error);
    throw error;
  }
}

export const checkWebsiteImageGenerationEnabled = async (websiteId: string) => {
  try {
    const { data, error } = await supabase
      .from('websites')
      .select('enable_ai_image_generation')
      .eq('id', websiteId)
      .single();

    if (error) {
      throw error;
    }

    return data?.enable_ai_image_generation || false;
  } catch (error) {
    console.error('Error checking website image generation setting:', error);
    throw error;
  }
};
