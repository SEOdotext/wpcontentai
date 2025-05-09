import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface GenerateRequest {
  post_theme_id: string;
  platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook' | 'x';
  website_id: string;
}

interface SomeSettings {
  tone: string;
  hashtags: string;
  mentions: string;
  platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook' | 'x';
  format_preference: {
    post_type?: 'single' | 'carousel';
    slides_count?: number;
  };
  post_length: number | null;
  simple_post_format_example: string | null;
}

interface Website {
  language: string;
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
      .select('subject_matter, keywords, post_content, wp_post_url')
      .eq('id', post_theme_id)
      .single();

    if (postThemeError) throw new Error('Failed to fetch post theme');

    // Fetch platform settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('some_settings')
      .select('tone, hashtags, mentions, post_length, format_preference, simple_post_format_example')
      .eq('website_id', website_id)
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (settingsError) throw new Error('Failed to fetch platform settings');

    // Fetch website language setting
    const { data: website, error: websiteError } = await supabaseClient
      .from('websites')
      .select('language')
      .eq('id', website_id)
      .single();

    if (websiteError) throw new Error('Failed to fetch website settings');

    // Construct the prompt
    const prompt = constructPrompt(platform, postTheme, settings, website.language);

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
            content: `You are a professional social media content creator that specializes in creating platform-optimized content in ${website.language || 'English'}. 
IMPORTANT: You MUST write ALL content in ${website.language || 'English'}. This includes:
- Main content
- Hashtags
- Mentions
- Call-to-actions
- Slide markers
- Any other text elements

Never mix languages or switch to English unless explicitly requested. Maintain consistent language throughout the entire post.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
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
  postTheme: { subject_matter: string; keywords: string[]; post_content: string | null; wp_post_url: string | null }, 
  settings: SomeSettings,
  language: string
): string {
  const platformLimits = {
    linkedin: 3000,
    instagram: 2200,
    tiktok: 2200,
    facebook: 63206,
    x: 280
  };

  const maxLength = settings.post_length || platformLimits[platform as keyof typeof platformLimits] || 2200;

  let basePrompt = `Create a ${platform} post in ${language || 'English'} about:
Subject: ${postTheme.subject_matter}
Keywords: ${postTheme.keywords?.join(', ') || ''}

${postTheme.post_content ? `Original Content Summary: ${postTheme.post_content.substring(0, 500)}...` : ''}
${postTheme.wp_post_url ? `\nOriginal Post URL: ${postTheme.wp_post_url}` : ''}

Format your post following this example structure:
${settings.simple_post_format_example || ''}

Requirements:
1. Follow the format example above exactly, replacing the placeholder content with relevant content about the subject
2. Maximum length: ${maxLength} characters
3. Write everything in ${language || 'English'}
4. Use these hashtags if relevant: ${settings.hashtags?.split('\n').filter(Boolean).join(', ')}
5. Use these mentions if relevant: ${settings.mentions?.split('\n').filter(Boolean).join(', ')}
${postTheme.wp_post_url ? `6. Include a call-to-action to read the full article at: ${postTheme.wp_post_url}` : ''}
7. Do not add quotation marks at the start or end of the post
8. Do not add any labels or formatting instructions in the output

Write the complete post now, formatted exactly as shown in the example above.`;

  return basePrompt;
} 