import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Database } from '@/types/supabase';
import { useWebsites } from '@/context/WebsitesContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from 'lodash';
import { 
  Send, 
  Loader2, 
  RefreshCw, 
  X, 
  MessageSquare, 
  Edit2, 
  Eye,
  Globe,
  Linkedin,
  Instagram,
  Facebook,
  Share2,
  FileEdit,
  BookOpen,
  Heart,
  MessageCircle,
  Bookmark,
  Twitter
} from 'lucide-react';
import { TikTokLogo } from '@/components/icons/TikTokLogo';

// Exactly match the database schema
interface SomeSettings {
  id: string;
  website_id: string;
  platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook' | 'x';
  tone: string | null;
  hashtags: string | null;
  mentions: string | null;
  image_prompt: string | null;
  image_formats: string | null;
  is_active: boolean;
  format_preference: {
    post_type?: 'single' | 'carousel';
    slides_count?: number;
  } | null;
  post_length: number | null;
  simple_post_format_example: string | null;
  created_at: string;
  updated_at: string;
}

export const SocialMediaSettings = () => {
  const { currentWebsite } = useWebsites();
  const [settings, setSettings] = useState<SomeSettings[]>([]);
  const [loading, setLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});

  // Create debounced update function
  const debouncedUpdate = useCallback(
    debounce(async (platform: SomeSettings['platform'], values: Partial<SomeSettings>) => {
      await updatePlatformSettings(platform, true, values);
    }, 1000),
    []
  );

  // Handle text input changes with debouncing
  const handleTextChange = (platform: SomeSettings['platform'], field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
    debouncedUpdate(platform, { [field]: value });
  };

  const getDefaultTone = (platform: string) => {
    const defaults = {
      linkedin: `Write in a professional and insightful tone that resonates with business professionals. Do not add any labels or formatting instructions to the output.

- Each post should provide valuable industry insights or professional development tips
- Include relevant statistics or data points when possible
- Use business-appropriate language but avoid jargon
- Structure: Hook → Value → Insight → Call-to-action
- Keep paragraphs short and scannable
- End with a thought-provoking question or actionable takeaway
- Aim for a mix of authority and approachability
- Include 2-3 relevant hashtags maximum
- Do not add labels like [Hook], [Main Point], etc.
- Do not add formatting instructions or placeholders`,

      instagram: `Create visually descriptive and engaging content that works well with images. Do not add any labels or formatting instructions to the output.

- Start with an attention-grabbing first line that stops the scroll
- Use emotive and descriptive language that complements visual content
- Break text into very short, easily digestible paragraphs
- Include a mix of professional insights and behind-the-scenes glimpses
- Use emoji sparingly but strategically to break up text
- End with a clear call-to-action or question
- Incorporate 5-7 relevant hashtags
- Keep the overall tone friendly and authentic
- Do not add labels like [Hook], [Main Point], etc.
- Do not add formatting instructions or placeholders`,

      tiktok: `Write in a dynamic, conversational style that works well for video content. Do not add any labels or formatting instructions to the output.

- Start with a hook that grabs attention in the first 2 seconds
- Use casual, natural language as if speaking to a friend
- Keep sentences short and punchy
- Include clear step-by-step instructions or lists
- Add personality and humor where appropriate
- Focus on trending topics or challenges in your industry
- End with a strong call-to-action
- Use trending audio or music references when relevant
- Do not add labels like [Hook], [Main Point], etc.
- Do not add formatting instructions or placeholders`,

      facebook: `Write in an engaging, community-focused tone that encourages interaction. Do not add any labels or formatting instructions to the output.

- Start with a relatable situation or question
- Use a conversational, friendly tone
- Include storytelling elements to increase engagement
- Keep paragraphs short and easy to read
- Ask questions throughout to encourage comments
- Include clear calls-to-action
- Balance professional insights with personality
- End with an invitation for discussion
- Aim for content that sparks conversations
- Do not add labels like [Hook], [Main Point], etc.
- Do not add formatting instructions or placeholders`,

      x: `Write concise, impactful content optimized for X (Twitter). Do not add any labels or formatting instructions to the output.

- Start with a strong hook that captures attention immediately
- Keep messages clear and concise
- Use a mix of professional insight and personality
- Include 1-2 relevant hashtags maximum
- End with a clear call-to-action or engaging question
- Aim for content that encourages retweets and replies
- Keep within character limit (280 characters)
- Do not add labels like [Hook], [Main Point], etc.
- Do not add formatting instructions or placeholders`
    };

    return defaults[platform as keyof typeof defaults] || '';
  };

  const getDefaultFormat = (platform: string) => {
    const defaults = {
      linkedin: `🎯 Main message here

Key point or insight that adds value.

💡 Pro tip or actionable advice.

#Hashtag1 #Hashtag2 #Hashtag3`,

      instagram: `✨ [Hook] Attention-grabbing opening line that makes people stop scrolling

🎯 [Main Point] Key insight or value proposition that draws readers in

💡 [Details] Supporting information or tips
• Point 1
• Point 2
• Point 3

🔑 [Call to Action] Clear next step for readers

.
.
.

#IndustryHashtag #BrandHashtag #TopicHashtag
#Hashtag4 #Hashtag5 #Hashtag6 #Hashtag7

@mention1 @mention2`,

      tiktok: `🎬 Hook that grabs attention

💫 Main point
📍 Key details

#Hashtag1 #Hashtag2`,

      facebook: `💡 Opening hook

Main message here. Keep it conversational and engaging.

🔑 Key takeaway or call-to-action

#RelevantHashtag`,

      x: `Key message here 🎯

Value-add or insight 💡

#Hashtag1 #Hashtag2`
    };

    return defaults[platform as keyof typeof defaults] || '';
  };

  const handleResetTone = async (platform: string, currentSetting: SomeSettings) => {
    const defaultTone = getDefaultTone(platform);
    await updatePlatformSettings(platform as SomeSettings['platform'], true, { tone: defaultTone });
    toast.success(`Reset ${platform} tone to default`);
  };

  // Fetch settings when website changes
  useEffect(() => {
    if (currentWebsite) {
      fetchSettings();
    }
  }, [currentWebsite]);

  const fetchSettings = async () => {
    if (!currentWebsite) return;
    
    setLoading(true);
    try {
    const { data, error } = await supabase
      .from('some_settings')
      .select('*')
        .eq('website_id', currentWebsite.id);

    if (error) {
        toast.error('Failed to load social media settings');
      console.error('Error fetching settings:', error);
    } else {
      setSettings(data || []);
    }
    } catch (err) {
      console.error('Error in fetchSettings:', err);
      toast.error('Failed to load social media settings');
    } finally {
    setLoading(false);
    }
  };

  const updatePlatformSettings = async (platform: SomeSettings['platform'], isActive: boolean, values?: Partial<SomeSettings>) => {
    if (!currentWebsite) return;

    try {
      // First, check if settings already exist for this platform
      const { data: existingData, error: fetchError } = await supabase
        .from('some_settings')
        .select('*')
        .eq('website_id', currentWebsite.id)
        .eq('platform', platform)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error('Error checking existing settings:', fetchError);
        toast.error(`Failed to check ${platform} settings`);
        return;
      }

      const settingData = {
        website_id: currentWebsite.id,
        platform,
        is_active: isActive,
        updated_at: new Date().toISOString(),
        ...values
      };

      if (existingData) {
        // Update existing settings
        console.log(`Updating existing ${platform} settings`);
        const { error: updateError } = await supabase
          .from('some_settings')
          .update(settingData)
          .eq('id', existingData.id);

        if (updateError) {
          console.error('Error updating settings:', updateError);
          toast.error(`Failed to update ${platform} settings`);
        } else {
          console.log(`${platform} settings updated successfully`);
          await fetchSettings(); // Refresh settings after update
        }
      } else {
        // Insert new settings
        console.log(`Creating new ${platform} settings`);
        const { error: insertError } = await supabase
          .from('some_settings')
          .insert([{
            ...settingData,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          console.error('Error creating settings:', insertError);
          toast.error(`Failed to create ${platform} settings`);
        } else {
          console.log(`${platform} settings created successfully`);
          await fetchSettings(); // Refresh settings after insert
        }
      }
    } catch (err) {
      console.error('Error in updatePlatformSettings:', err);
      toast.error(`Failed to update ${platform} settings`);
    }
  };

  const platforms = [
    { key: 'linkedin' as const, name: 'LinkedIn', icon: <Linkedin className="h-5 w-5" /> },
    { key: 'instagram' as const, name: 'Instagram', icon: <Instagram className="h-5 w-5" /> },
    { key: 'tiktok' as const, name: 'TikTok', icon: <TikTokLogo className="h-5 w-5" /> },
    { key: 'facebook' as const, name: 'Facebook', icon: <Facebook className="h-5 w-5" /> },
    { key: 'x' as const, name: 'X (Twitter)', icon: <Twitter className="h-5 w-5" /> }
  ];

  return (
        <div className="space-y-6">
          {platforms.map(platform => {
            const setting = settings.find(s => s.platform === platform.key);
            const localSetting = localSettings[platform.key] || {};
            
            return (
          <Card key={platform.key}>
            <CardHeader>
              <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                  <div className="text-muted-foreground">
                    {platform.icon}
                  </div>
                  <CardTitle className="text-xl">{platform.name}</CardTitle>
                  </div>
                  <Switch
                    checked={setting?.is_active || false}
                  onCheckedChange={(checked) => updatePlatformSettings(platform.key, checked)}
                  disabled={loading}
                  />
                </div>
            </CardHeader>

                {setting?.is_active && (
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {platform.key === 'instagram' && (
                    <div className="space-y-2">
                      <Label>Post Format Preference</Label>
                      <Select
                        value={setting?.format_preference?.post_type || 'single'}
                        onValueChange={(value) => updatePlatformSettings(platform.key, true, {
                          format_preference: {
                      ...setting?.format_preference,
                            post_type: value as 'single' | 'carousel',
                            slides_count: value === 'carousel' ? (setting?.format_preference?.slides_count || 5) : undefined
                      }
                    })}
                  >
                        <SelectTrigger>
                          <SelectValue placeholder="Select post format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single Post</SelectItem>
                          <SelectItem value="carousel">Carousel Post</SelectItem>
                        </SelectContent>
                      </Select>

                      {setting?.format_preference?.post_type === 'carousel' && (
                        <div className="space-y-2">
                          <Label>Number of Slides</Label>
                          <Select
                            value={String(setting?.format_preference?.slides_count || 5)}
                            onValueChange={(value) => updatePlatformSettings(platform.key, true, {
                              format_preference: {
                                ...setting?.format_preference,
                                slides_count: parseInt(value)
                              }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select number of slides" />
                            </SelectTrigger>
                            <SelectContent>
                              {[3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                <SelectItem key={num} value={String(num)}>{num} Slides</SelectItem>
                              ))}
                            </SelectContent>
                        </Select>
                          <p className="text-sm text-muted-foreground">
                            Choose how many slides you want in your carousel posts. Each slide will contain a portion of your content in a logical sequence.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tone & Prompt Instructions</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetTone(platform.key, setting)}
                        className="h-8"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset to Default
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Describe both the tone and specific instructions for content generation"
                      value={localSetting.tone || setting?.tone || getDefaultTone(platform.key)}
                      onChange={(e) => handleTextChange(platform.key, 'tone', e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <p className="text-sm text-muted-foreground">
                      These instructions guide the AI in generating platform-optimized content that matches your brand voice and the platform's best practices.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Hashtags</Label>
                    <Textarea
                      placeholder="Enter default hashtags (one per line)&#10;Example:&#10;#marketing&#10;#digitalmarketing&#10;#business"
                      value={localSetting.hashtags || setting?.hashtags || ''}
                      onChange={(e) => handleTextChange(platform.key, 'hashtags', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      The AI will consider these hashtags when generating posts for this platform. They help guide the AI to create content within your preferred categories and topics. Enter each hashtag on a new line, including the # symbol.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Mentions</Label>
                    <Textarea
                      placeholder="Enter default mentions (one per line)&#10;Example:&#10;@yourbrand&#10;@yourpartner&#10;@yourproduct"
                      value={localSetting.mentions || setting?.mentions || ''}
                      onChange={(e) => handleTextChange(platform.key, 'mentions', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      The AI will use these @mentions as context when generating posts. They help the AI understand which accounts to reference and include in the content. Enter each mention on a new line, including the @ symbol.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Maximum Post Length (characters)</Label>
                    <Input
                      type="number"
                      placeholder="Enter maximum post length"
                      value={localSetting.post_length || setting?.post_length || ''}
                      onChange={(e) => handleTextChange(platform.key, 'post_length', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Set the maximum number of characters for posts on this platform. Leave empty to use platform defaults.
                      {platform.key === 'linkedin' && ' LinkedIn: Recommended 150-300 characters (Max: 3000)'}
                      {platform.key === 'instagram' && ' Instagram: Recommended 100-200 characters (Max: 2200)'}
                      {platform.key === 'tiktok' && ' TikTok: Recommended 100-150 characters (Max: 2200)'}
                      {platform.key === 'facebook' && ' Facebook: Recommended 100-250 characters (Max: 63206)'}
                      {platform.key === 'x' && ' X (Twitter): Recommended 100-120 characters (Max: 280)'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Post Format Example</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePlatformSettings(platform.key, true, { simple_post_format_example: getDefaultFormat(platform.key) })}
                        className="h-8"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset to Default
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Enter a simple example of how you want your posts formatted"
                      value={localSetting.simple_post_format_example || setting?.simple_post_format_example || getDefaultFormat(platform.key)}
                      onChange={(e) => handleTextChange(platform.key, 'simple_post_format_example', e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <p className="text-sm text-muted-foreground">
                      This format will be used as a template for generating posts. Include placeholders for main content, hashtags, and any platform-specific elements.
                    </p>
                  </div>

                </div>
              </CardContent>
                )}
              </Card>
            );
          })}
    </div>
  );
}; 
