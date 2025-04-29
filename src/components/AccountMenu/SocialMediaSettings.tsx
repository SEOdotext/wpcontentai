import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, Switch, Form, Input, Select, Button, message, Space, Typography, Divider } from 'antd';
import { Database } from '@/types/supabase';
import { useWebsites } from '@/hooks/useWebsites';

const { Title, Text } = Typography;
const { Option } = Select;

interface PlatformSettings {
  id: string;
  website_id: string;
  platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook';
  tone?: string;
  format_preference?: any;
  other_settings?: any;
  is_active: boolean;
}

export const SocialMediaSettings = () => {
  const supabase = useSupabaseClient<Database>();
  const { websites, loading: websitesLoading } = useWebsites();
  const [selectedWebsite, setSelectedWebsite] = useState<string>();
  const [settings, setSettings] = useState<PlatformSettings[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch settings when website changes
  useEffect(() => {
    if (selectedWebsite) {
      fetchSettings();
    }
  }, [selectedWebsite]);

  const fetchSettings = async () => {
    if (!selectedWebsite) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('some_settings')
      .select('*')
      .eq('website_id', selectedWebsite);

    if (error) {
      message.error('Failed to load social media settings');
      console.error('Error fetching settings:', error);
    } else {
      setSettings(data || []);
    }
    setLoading(false);
  };

  const updatePlatformSettings = async (platform: string, isActive: boolean, values?: any) => {
    if (!selectedWebsite) return;

    const existingSetting = settings.find(s => s.platform === platform);
    const settingData = {
      website_id: selectedWebsite,
      platform,
      is_active: isActive,
      ...values
    };

    const { error } = existingSetting 
      ? await supabase
          .from('some_settings')
          .update(settingData)
          .eq('id', existingSetting.id)
      : await supabase
          .from('some_settings')
          .insert([settingData]);

    if (error) {
      message.error(`Failed to update ${platform} settings`);
      console.error('Error updating settings:', error);
    } else {
      message.success(`${platform} settings updated successfully`);
      fetchSettings();
    }
  };

  const platforms = [
    { key: 'linkedin', name: 'LinkedIn', icon: '🔗' },
    { key: 'instagram', name: 'Instagram', icon: '📸' },
    { key: 'tiktok', name: 'TikTok', icon: '🎵' },
    { key: 'facebook', name: 'Facebook', icon: '👤' }
  ];

  return (
    <div className="p-6">
      <Title level={2}>Social Media Settings</Title>
      <Text className="block mb-6">
        Configure your social media platforms and preferences for each website.
      </Text>

      <Select
        className="w-full mb-6"
        placeholder="Select a website"
        loading={websitesLoading}
        value={selectedWebsite}
        onChange={setSelectedWebsite}
      >
        {websites?.map(website => (
          <Option key={website.id} value={website.id}>{website.name}</Option>
        ))}
      </Select>

      {selectedWebsite && (
        <div className="space-y-6">
          {platforms.map(platform => {
            const setting = settings.find(s => s.platform === platform.key);
            
            return (
              <Card key={platform.key} className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{platform.icon}</span>
                    <Title level={4} className="m-0">{platform.name}</Title>
                  </div>
                  <Switch
                    checked={setting?.is_active || false}
                    onChange={(checked) => updatePlatformSettings(platform.key, checked)}
                    loading={loading}
                  />
                </div>

                {setting?.is_active && (
                  <Form
                    layout="vertical"
                    initialValues={{
                      tone: setting?.tone,
                      ...setting?.format_preference,
                      ...setting?.other_settings
                    }}
                    onFinish={(values) => updatePlatformSettings(platform.key, true, {
                      tone: values.tone,
                      format_preference: {
                        imageSize: values.imageSize,
                        videoLength: values.videoLength
                      },
                      other_settings: {
                        hashtags: values.hashtags,
                        mentions: values.mentions
                      }
                    })}
                  >
                    <Form.Item label="Tone of Voice" name="tone">
                      <Select>
                        <Option value="professional">Professional</Option>
                        <Option value="casual">Casual</Option>
                        <Option value="friendly">Friendly</Option>
                        <Option value="formal">Formal</Option>
                      </Select>
                    </Form.Item>

                    {(platform.key === 'instagram' || platform.key === 'facebook') && (
                      <Form.Item label="Preferred Image Size" name="imageSize">
                        <Select>
                          <Option value="square">Square (1:1)</Option>
                          <Option value="portrait">Portrait (4:5)</Option>
                          <Option value="landscape">Landscape (16:9)</Option>
                        </Select>
                      </Form.Item>
                    )}

                    {platform.key === 'tiktok' && (
                      <Form.Item label="Video Length" name="videoLength">
                        <Select>
                          <Option value="short">Short (≤15s)</Option>
                          <Option value="medium">Medium (≤60s)</Option>
                          <Option value="long">Long (≤3m)</Option>
                        </Select>
                      </Form.Item>
                    )}

                    <Form.Item label="Default Hashtags" name="hashtags">
                      <Input.TextArea placeholder="Enter default hashtags (one per line)" />
                    </Form.Item>

                    <Form.Item label="Default Mentions" name="mentions">
                      <Input.TextArea placeholder="Enter default mentions (one per line)" />
                    </Form.Item>

                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={loading}>
                        Save {platform.name} Settings
                      </Button>
                    </Form.Item>
                  </Form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}; 