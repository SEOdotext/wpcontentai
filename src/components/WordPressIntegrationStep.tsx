import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebsites } from '@/context/WebsitesContext';
import { createClient } from '@supabase/supabase-js';

const WordPressIntegrationStep: React.FC = () => {
  const navigate = useNavigate();
  const { currentWebsite } = useWebsites();
  const [isWordPressConnected, setIsWordPressConnected] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkWordPressConnection = async () => {
      if (!currentWebsite?.id) {
        setIsWordPressConnected(null);
        return;
      }

      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { data } = await supabase
        .from('wordpress_settings')
        .select('is_connected')
        .eq('website_id', currentWebsite.id)
        .single();

      setIsWordPressConnected(data?.is_connected ?? false);
    };

    checkWordPressConnection();
  }, [currentWebsite?.id]);

  if (!currentWebsite || isWordPressConnected !== false) {
    return null;
  }
  
  return (
    <Card className="w-full bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Link className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-4 flex-grow text-center sm:text-left">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-primary">
                Connect Your WordPress Site
              </h3>
              <p className="text-sm text-muted-foreground">
                Take your content strategy to the next level! Connect your WordPress site to automatically publish your AI-generated content and streamline your workflow.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:space-x-2">
              <Button
                variant="default"
                onClick={() => navigate('/settings/wordpress')}
                className="w-full sm:w-auto space-x-2"
              >
                <span>Set up WordPress Integration</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WordPressIntegrationStep; 