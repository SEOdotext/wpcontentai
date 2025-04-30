import { useState, useEffect } from 'react';
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
import { Linkedin, Instagram, Facebook, Video, RefreshCw } from 'lucide-react';

// Exactly match the database schema
interface SomeSettings {
  id: string;
  website_id: string;
  platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook';
  tone: string | null;
  hashtags: string | null;
  mentions: string | null;
  image_prompt: string | null;
  image_formats: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const SocialMediaSettings = () => {
  const { currentWebsite } = useWebsites();
  const [settings, setSettings] = useState<SomeSettings[]>([]);
  const [loading, setLoading] = useState(false);

  const getDefaultTone = (platform: string) => {
    const defaults = {
      linkedin: `Write in a professional and insightful tone that resonates with business professionals. 
- Each post should provide valuable industry insights or professional development tips
- Include relevant statistics or data points when possible
- Use business-appropriate language but avoid jargon
- Structure: Hook → Value → Insight → Call-to-action
- Keep paragraphs short and scannable
- End with a thought-provoking question or actionable takeaway
- Aim for a mix of authority and approachability
- Include 2-3 relevant hashtags maximum`,

      instagram: `Create visually descriptive and engaging content that works well with images.
- Start with an attention-grabbing first line that stops the scroll
- Use emotive and descriptive language that complements visual content
- Break text into very short, easily digestible paragraphs
- Include a mix of professional insights and behind-the-scenes glimpses
- Use emoji sparingly but strategically to break up text
- End with a clear call-to-action or question
- Incorporate 5-7 relevant hashtags
- Keep the overall tone friendly and authentic`,

      tiktok: `Write in a dynamic, conversational style that works well for video content.
- Start with a hook that grabs attention in the first 2 seconds
- Use casual, natural language as if speaking to a friend
- Keep sentences short and punchy
- Include clear step-by-step instructions or lists
- Add personality and humor where appropriate
- Focus on trending topics or challenges in your industry
- End with a strong call-to-action
- Use trending audio or music references when relevant`,

      facebook: `Write in an engaging, community-focused tone that encourages interaction.
- Start with a relatable situation or question
- Use a conversational, friendly tone
- Include storytelling elements to increase engagement
- Keep paragraphs short and easy to read
- Ask questions throughout to encourage comments
- Include clear calls-to-action
- Balance professional insights with personality
- End with an invitation for discussion
- Aim for content that sparks conversations`
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
      const existingSetting = settings.find(s => s.platform === platform);
      
      const settingData = {
        website_id: currentWebsite.id,
        platform,
        is_active: isActive,
        updated_at: new Date().toISOString(),
        ...values
      };

      if (existingSetting) {
        const { error } = await supabase
          .from('some_settings')
          .update(settingData)
          .eq('id', existingSetting.id);

        if (error) {
          toast.error(`Failed to update ${platform} settings`);
          console.error('Error updating settings:', error);
        } else {
          toast.success(`${platform} settings updated successfully`);
          fetchSettings();
        }
      } else {
        const { error } = await supabase
          .from('some_settings')
          .insert([{
            ...settingData,
            created_at: new Date().toISOString()
          }]);

        if (error) {
          if (error.code === '23505') {
            toast.error(`Settings for ${platform} already exist`);
          } else {
            toast.error(`Failed to create ${platform} settings`);
          }
          console.error('Error creating settings:', error);
        } else {
          toast.success(`${platform} settings created successfully`);
          fetchSettings();
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
    { key: 'tiktok' as const, name: 'TikTok', icon: <Video className="h-5 w-5" /> },
    { key: 'facebook' as const, name: 'Facebook', icon: <Facebook className="h-5 w-5" /> }
  ];

  return (
    <div className="space-y-6">
      {platforms.map(platform => {
        const setting = settings.find(s => s.platform === platform.key);
        
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
                      value={setting?.tone || getDefaultTone(platform.key)}
                      onChange={(e) => updatePlatformSettings(platform.key, true, { tone: e.target.value })}
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
                      value={setting?.hashtags || ''}
                      onChange={(e) => updatePlatformSettings(platform.key, true, { hashtags: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">
                      The AI will consider these hashtags when generating posts for this platform. They help guide the AI to create content within your preferred categories and topics. Enter each hashtag on a new line, including the # symbol.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Mentions</Label>
                    <Textarea
                      placeholder="Enter default mentions (one per line)&#10;Example:&#10;@yourbrand&#10;@yourpartner&#10;@yourproduct"
                      value={setting?.mentions || ''}
                      onChange={(e) => updatePlatformSettings(platform.key, true, { mentions: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">
                      The AI will use these @mentions as context when generating posts. They help the AI understand which accounts to reference and include in the content. Enter each mention on a new line, including the @ symbol.
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
