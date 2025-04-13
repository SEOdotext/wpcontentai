import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicNav from '@/components/PublicNav';

const LandingPage: React.FC = () => {
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