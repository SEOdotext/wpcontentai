import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface GenerateRequest {
  post_theme_id: string;
  platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook';
  website_id: string;
}

interface SomeSettings {
  tone: string;
  hashtags: string;
  mentions: string;
  platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook';
}

serve(async (req) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { post_theme_id, platform, website_id } = await req.json() as GenerateRequest;

    // Get Supabase client with admin privileges
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First update status to pending
    await supabaseClient
      .from('some_posts')
      .update({ status: 'pending' })
      .eq('post_theme_id', post_theme_id)
      .eq('platform', platform);

    // Fetch the post theme content
    const { data: postTheme, error: postThemeError } = await supabaseClient
      .from('post_themes')
      .select('subject_matter, keywords, post_content')
      .eq('id', post_theme_id)
      .single();

    if (postThemeError) throw new Error('Failed to fetch post theme');

    // Fetch platform settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('some_settings')
      .select('tone, hashtags, mentions')
      .eq('website_id', website_id)
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (settingsError) throw new Error('Failed to fetch platform settings');

    // Construct the prompt
    const prompt = constructPrompt(platform, postTheme, settings);

    // Generate content using OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a professional social media content creator that specializes in creating platform-optimized content."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const completion = await openaiResponse.json();
    const generatedContent = completion.choices[0].message?.content;
    
    if (!generatedContent) throw new Error('No content generated');

    // Update the post with generated content
    const { error: updateError } = await supabaseClient
      .from('some_posts')
      .update({ 
        content: generatedContent,
        status: 'textgenerated',
        updated_at: new Date().toISOString()
      })
      .eq('post_theme_id', post_theme_id)
      .eq('platform', platform);

    if (updateError) throw new Error('Failed to update post with generated content');

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: generatedContent 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function constructPrompt(
  platform: string, 
  postTheme: { subject_matter: string; keywords: string[]; post_content: string | null }, 
  settings: SomeSettings
): string {
  const platformSpecifics = {
    linkedin: {
      maxLength: 3000,
      format: "Professional, business-focused content with industry insights"
    },
    instagram: {
      maxLength: 2200,
      format: "Visual, engaging, and concise with emojis and hashtags"
    },
    tiktok: {
      maxLength: 2200,
      format: "Short, punchy, and trend-aware content"
    },
    facebook: {
      maxLength: 63206,
      format: "Conversational and engaging community-focused content"
    }
  };

  const spec = platformSpecifics[platform as keyof typeof platformSpecifics];

  return `Create a ${platform} post about:
Subject: ${postTheme.subject_matter}
Keywords: ${postTheme.keywords?.join(', ') || ''}

${postTheme.post_content ? `Original Content Summary: ${postTheme.post_content.substring(0, 500)}...` : ''}

Platform Requirements:
- Maximum length: ${spec.maxLength} characters
- Format style: ${spec.format}

Tone Instructions:
${settings.tone || 'Professional and engaging'}

${settings.hashtags ? `Use these hashtags where appropriate:
${settings.hashtags}` : ''}

${settings.mentions ? `Include these mentions where relevant:
${settings.mentions}` : ''}

Generate a platform-optimized post that captures the key message while following the platform's best practices and tone requirements.`;
} 