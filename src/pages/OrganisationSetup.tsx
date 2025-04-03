import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Globe } from 'lucide-react';
import { useOrganisation } from '@/context/OrganisationContext';
import { Toaster } from "@/components/ui/sonner";
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

const OrganisationSetup = () => {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { completeNewUserSetup, hasOrganisation, isLoading } = useOrganisation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };
    
    checkAuth();
  }, []);

  const generateOrgName = (url: string): string => {
    // Remove protocol and www
    let domain = url.replace(/^https?:\/\/(www\.)?/, '');
    // Remove TLD (.com, .org, etc.) and anything after it
    domain = domain.split('.')[0];
    // Capitalize first letter of each word
    return domain
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!websiteUrl.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const success = await completeNewUserSetup(websiteUrl);
      
      if (success) {
        window.location.href = '/'; // Full page refresh to ensure all contexts are updated
      } else {
        throw new Error('Failed to complete setup');
      }
    } catch (error) {
      console.error('Error during setup:', error);
      toast.error('Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle loading state
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, redirect to auth page
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  // If user already has an organisation, redirect to home
  if (hasOrganisation) {
    return <Navigate to="/" replace />;
  }

  // Only show the setup form if user is authenticated and has no organization
  return (
    <>
      <Helmet>
        <title>Setup Your Website | WP Content AI</title>
        <meta name="description" content="Get started with WP Content AI by setting up your website" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Complete Your Setup</CardTitle>
            <CardDescription>
              Enter your website URL to get started with ContentGardener.ai
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website-url">Website URL</Label>
                <Input
                  id="website-url"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    </>
  );
};

export default OrganisationSetup;
