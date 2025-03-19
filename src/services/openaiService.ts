import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define OpenAI message interface
interface OpenAIMessage {
  role: string;
  content: string;
}

// Define request payload interface
interface OpenAIRequestPayload {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

// Supabase Edge Function URL
const SUPABASE_FUNCTIONS_URL = 'https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1';

/**
 * Makes a request to the OpenAI API via our secure Supabase Edge Function
 * 
 * @param payload The OpenAI request payload
 * @returns The OpenAI API response
 */
export const callOpenAI = async (payload: OpenAIRequestPayload) => {
  const startTime = new Date();
  try {
    console.log(`[${startTime.toISOString()}] Calling OpenAI via Supabase Edge Function`);
    console.log('Request details:', {
      model: payload.model,
      messagesCount: payload.messages.length,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
      firstMessagePreview: payload.messages[0]?.content.substring(0, 50) + '...'
    });
    
    // Get the user's session for auth
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) {
      throw new Error('Not authenticated');
    }
    
    // Call the Edge Function with auth
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/ai-service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`
      },
      body: JSON.stringify({
        service: 'openai',
        payload: payload
      })
    });
    
    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Ignore JSON parse error
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    console.log(`[${endTime.toISOString()}] OpenAI API Response via Edge Function (took ${duration}ms):`, {
      status: 'success',
      model: data.model,
      hasChoices: !!data.choices?.length,
      firstChoiceLength: data.choices?.[0]?.message?.content?.length
    });
    
    return data;
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.error(`[${endTime.toISOString()}] Error calling OpenAI API (after ${duration}ms):`, error);
    
    // Show user-friendly error message
    toast.error(
      error instanceof Error && error.message.includes('Not authenticated')
        ? 'Please log in to use AI features'
        : 'AI service error. Please try again later.'
    );
    
    throw error;
  }
};

/**
 * Generates content using OpenAI's chat completion API
 * 
 * @param systemPrompt Instructions for the AI
 * @param userPrompt User's request
 * @param model OpenAI model to use (default: gpt-3.5-turbo)
 * @param options Additional options for the request
 * @returns Generated content from the AI
 */
export const generateContent = async (
  systemPrompt: string,
  userPrompt: string,
  model: string = 'gpt-3.5-turbo',
  options: {
    temperature?: number;
    max_tokens?: number;
  } = {}
): Promise<string> => {
  try {
    const response = await callOpenAI({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens
    });
    
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content;
    } else {
      throw new Error('No content generated');
    }
  } catch (error) {
    console.error('Error generating content:', error);
    toast.error('Failed to generate content. Please try again later.');
    throw error;
  }
}; 