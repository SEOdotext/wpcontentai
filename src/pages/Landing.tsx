import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicNav from '@/components/PublicNav';

const LandingPage: React.FC = () => {
  const storeOnboardingAnalytics = async (websiteUrl: string, status: string, previousWebsiteId?: string) => {
    try {
      console.log('Storing onboarding analytics:', { websiteUrl, status, previousWebsiteId });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/store-onboarding-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          website_url: websiteUrl,
          website_id: websiteId,
          status,
          previous_website_id: previousWebsiteId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error storing onboarding analytics:', errorData);
        
        // Store error in onboarding table
        await supabase
          .from('onboarding')
          .upsert({
            website_id: websiteId,
            error: JSON.stringify({
              message: errorData.error || 'Failed to store onboarding analytics',
              status: response.status,
              timestamp: new Date().toISOString()
            }),
            updated_at: new Date().toISOString()
          });
        
        throw new Error(errorData.error || 'Failed to store onboarding analytics');
      }

      const data = await response.json();
      console.log('Successfully stored onboarding analytics:', data);
      return data;
    } catch (error) {
      console.error('Error in storeOnboardingAnalytics:', error);
      
      // Store error in onboarding table
      await supabase
        .from('onboarding')
        .upsert({
          website_id: websiteId,
          error: JSON.stringify({
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            timestamp: new Date().toISOString()
          }),
          updated_at: new Date().toISOString()
        });
      
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Grow your content garden</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Let AI handle your content creation while you focus on what matters most.
          </p>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-lg border border-border">
            <h3 className="text-xl font-semibold mb-2">AI-Powered Content</h3>
            <p className="text-muted-foreground">
              Generate high-quality content tailored to your needs with our advanced AI technology.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border">
            <h3 className="text-xl font-semibold mb-2">Time-Saving Tools</h3>
            <p className="text-muted-foreground">
              Automate your content creation process and focus on growing your business.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border">
            <h3 className="text-xl font-semibold mb-2">Flexible Plans</h3>
            <p className="text-muted-foreground">
              Choose the perfect plan for your needs, from hobby to agency scale.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to grow your content?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join the growing community of content creators who trust our platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 