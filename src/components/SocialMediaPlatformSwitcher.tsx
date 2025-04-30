import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Linkedin, Instagram, Facebook, Video, Globe } from 'lucide-react';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useWebsites } from '@/context/WebsitesContext';

interface SocialMediaPlatformSwitcherProps {
  onPlatformChange: (platform: string | null) => void;
  currentPlatform?: string | null;
  className?: string;
}

interface SomeSettings {
  id: string;
  website_id: string;
  platform: 'linkedin' | 'instagram' | 'tiktok' | 'facebook';
  is_active: boolean;
}

export const SocialMediaPlatformSwitcher: React.FC<SocialMediaPlatformSwitcherProps> = ({
  onPlatformChange,
  currentPlatform,
  className
}) => {
  const { currentWebsite } = useWebsites();
  const [activeSettings, setActiveSettings] = useState<SomeSettings[]>([]);
  const [loading, setLoading] = useState(false);

  const platforms = [
    { key: null, name: 'Website', icon: <Globe className="h-4 w-4" /> },
    { key: 'linkedin', name: 'LinkedIn', icon: <Linkedin className="h-4 w-4" /> },
    { key: 'instagram', name: 'Instagram', icon: <Instagram className="h-4 w-4" /> },
    { key: 'tiktok', name: 'TikTok', icon: <Video className="h-4 w-4" /> },
    { key: 'facebook', name: 'Facebook', icon: <Facebook className="h-4 w-4" /> }
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentWebsite) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('some_settings')
          .select('*')
          .eq('website_id', currentWebsite.id)
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching social media settings:', error);
        } else {
          setActiveSettings(data || []);
          // If we have active settings and no platform is selected, keep it as website view
          if (!currentPlatform && currentPlatform !== null) {
            onPlatformChange(null);
          }
        }
      } catch (err) {
        console.error('Error in fetchSettings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [currentWebsite, currentPlatform, onPlatformChange]);

  return (
    <Card className={cn("border-none shadow-none", className)}>
      <CardContent className="p-2">
        <div className="flex gap-2">
          {platforms.map(platform => {
            // Always show Website option
            if (platform.key === null) {
              return (
                <Button
                  key="website"
                  variant={currentPlatform === null ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => onPlatformChange(null)}
                  disabled={loading}
                >
                  {platform.icon}
                  <span className="hidden sm:inline">{platform.name}</span>
                </Button>
              );
            }

            // Show social platforms only if they are active
            const isActive = activeSettings.some(s => s.platform === platform.key);
            if (!isActive) return null;

            return (
              <Button
                key={platform.key}
                variant={currentPlatform === platform.key ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => onPlatformChange(platform.key)}
                disabled={loading}
              >
                {platform.icon}
                <span className="hidden sm:inline">{platform.name}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}; 