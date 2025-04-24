import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting chat-content-update function');
    
    // Get the request body
    const { post_theme_id, message, current_content } = await req.json();
    console.log('Request payload:', { post_theme_id, messageLength: message?.length });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the post theme from the database
    console.log('Fetching post theme from database');
    const { data: postTheme, error: postThemeError } = await supabaseClient
      .from('post_themes')
      .select('*')
      .eq('id', post_theme_id)
      .single();

    if (postThemeError) {
      console.error('Error fetching post theme:', postThemeError);
      throw postThemeError;
    }
    if (!postTheme) {
      console.error('Post theme not found:', post_theme_id);
      throw new Error('Post theme not found');
    }

    // Prepare the prompt
    const prompt = `You are an AI content editor. The user wants to modify the following content:

Current content:
${current_content}

User's request:
${message}

IMPORTANT INSTRUCTIONS:
1. You must return the ENTIRE content, not just the modified section
2. Preserve ALL HTML tags, formatting, and structure
3. Only modify the specific parts mentioned in the user's request
4. Keep all other content exactly as it is
5. Return the complete HTML document with all sections intact

Please provide the complete updated content that addresses the user's request while maintaining the original style and tone. Return the entire content with your modifications, not just the changed section.`;

    // Make API request
    console.log('Making API request');
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('API key not found');
    }

    // Make a direct fetch request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: "system",
            content: "You are an AI content editor. Your task is to modify content based on user requests while maintaining the original style, tone, and HTML structure. You must ALWAYS return the complete content with your modifications, never just the modified section. Preserve all formatting, tags, and structure of the original content."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('API response received');
    const updatedContent = data.choices[0]?.message?.content;

    if (!updatedContent) {
      console.error('No content generated');
      throw new Error('Failed to generate updated content');
    }

    // Update the post theme in the database
    console.log('Updating post theme in database');
    const { error: updateError } = await supabaseClient
      .from('post_themes')
      .update({ 
        post_content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', post_theme_id);

    if (updateError) {
      console.error('Error updating post theme:', updateError);
      throw updateError;
    }

    console.log('Successfully updated content');
    return new Response(
      JSON.stringify({
        success: true,
        content: updatedContent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in chat-content-update:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 