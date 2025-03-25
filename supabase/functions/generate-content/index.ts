import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  console.log('Received request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    console.log('Creating Supabase admin client');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('Supabase URL available:', !!supabaseUrl);
    console.log('Supabase key available:', !!supabaseKey);

    const supabaseAdmin = createClient(
      supabaseUrl ?? '',
      supabaseKey ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    console.log('Verifying JWT token');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error('Invalid token');
    }
    if (!user) {
      console.error('No user found for token');
      throw new Error('Invalid token');
    }
    console.log('User authenticated:', { id: user.id, email: user.email });

    // Validate request body
    const body = await req.json();
    console.log('Request body:', body);
    const { postThemeId } = body;
    
    if (!postThemeId) {
      throw new Error('Missing required field: postThemeId');
    }

    // Get the post theme details from the database
    console.log('Fetching post theme:', postThemeId);
    const { data: postTheme, error: postThemeError } = await supabaseAdmin
      .from('post_themes')
      .select('*')
      .eq('id', postThemeId)
      .single();

    if (postThemeError) {
      console.error('Database error fetching post theme:', postThemeError);
      throw new Error('Failed to fetch post theme from database');
    }

    if (!postTheme) {
      console.error('Post theme not found for ID:', postThemeId);
      throw new Error('Post theme not found');
    }

    console.log('Found post theme:', {
      id: postTheme.id,
      subject_matter: postTheme.subject_matter,
      keywords: postTheme.keywords,
      status: postTheme.status,
      created_at: postTheme.created_at
    });

    if (!postTheme.subject_matter || !postTheme.keywords) {
      console.error('Post theme missing required fields:', postTheme);
      throw new Error('Post theme is missing required fields: subject_matter or keywords');
    }

    // Get the OpenAI API key from environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI API key available:', !!openaiApiKey);
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    // Generate content using OpenAI
    const prompt = `Write a blog post about ${postTheme.subject_matter}.
Keywords to include: ${postTheme.keywords.join(', ')}.`;

    console.log('Sending request to OpenAI API with prompt:', prompt);
    console.log('OpenAI request configuration:', {
      model: 'gpt-4o',
      temperature: 0.7,
      promptLength: prompt.length
    });

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a professional blog writer.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    console.log('OpenAI API response status:', openaiResponse.status);
    console.log('OpenAI API response headers:', Object.fromEntries(openaiResponse.headers.entries()));

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => null);
      console.error('OpenAI API Error Response:', errorData);
      console.error('OpenAI API Error Status:', openaiResponse.status);
      console.error('OpenAI API Error Status Text:', openaiResponse.statusText);
      
      let errorMessage = 'Failed to generate content with OpenAI';
      if (errorData?.error?.message) {
        errorMessage = `OpenAI API Error: ${errorData.error.message}`;
      } else if (openaiResponse.status === 401) {
        errorMessage = 'Invalid OpenAI API key';
      } else if (openaiResponse.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded';
      } else if (openaiResponse.status === 503) {
        errorMessage = 'OpenAI API service unavailable';
      }
      
      throw new Error(errorMessage);
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI API response data:', {
      hasChoices: !!openaiData.choices,
      numChoices: openaiData.choices?.length,
      hasContent: !!openaiData.choices?.[0]?.message?.content,
      contentLength: openaiData.choices?.[0]?.message?.content?.length
    });

    if (!openaiData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    const generatedContent = openaiData.choices[0].message.content;
    console.log('Generated content length:', generatedContent.length);

    // Update the post theme in the database
    console.log('Updating post theme in database with:', {
      id: postThemeId,
      updates: {
        post_content: generatedContent.substring(0, 100) + '...', // Log first 100 chars
        status: 'generated',
        updated_at: new Date().toISOString()
      }
    });

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('post_themes')
      .update({
        post_content: generatedContent,
        status: 'generated',
        updated_at: new Date().toISOString()
      })
      .eq('id', postThemeId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating post theme:', updateError);
      throw new Error('Failed to update post theme in database');
    }

    console.log('Successfully updated post theme:', {
      id: updateData.id,
      status: updateData.status,
      hasContent: !!updateData.post_content,
      contentLength: updateData.post_content?.length,
      updatedAt: updateData.updated_at
    });

    console.log('Successfully generated and saved content');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-content function:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
}); 