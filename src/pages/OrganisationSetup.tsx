import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Globe } from 'lucide-react';
import { useOrganisation } from '@/context/OrganisationContext';
import { Toaster } from "@/components/ui/sonner";
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

const OrganisationSetup = () => {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { completeNewUserSetup, hasOrganisation, isLoading } = useOrganisation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Log initial state
  console.log('OrganisationSetup mounted:', {
    isAuthenticated,
    hasOrganisation,
    isLoading,
    isSubmitting
  });

  useEffect(() => {
    const checkAuth = async () => {
      console.log('Starting auth check...');
      try {
        const { data } = await supabase.auth.getSession();
        console.log('Auth session data:', data);
        const authenticated = !!data.session;
        console.log('Setting isAuthenticated to:', authenticated);
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  // Log state changes
  useEffect(() => {
    console.log('State updated:', {
      isAuthenticated,
      hasOrganisation,
      isLoading,
      isSubmitting
    });
  }, [isAuthenticated, hasOrganisation, isLoading, isSubmitting]);

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
    console.log('Form submitted with URL:', websiteUrl);
    
    if (!websiteUrl.trim()) {
      console.log('Empty website URL submitted');
      toast.error('Please enter a website URL');
      return;
    }
    
    console.log('Starting setup process...');
    setIsSubmitting(true);
    try {
      console.log('Calling completeNewUserSetup...');
      const success = await completeNewUserSetup(websiteUrl);
      console.log('Setup result:', success);
      
      if (success) {
        console.log('Setup successful, redirecting to home...');
        window.location.href = '/'; // Full page refresh to ensure all contexts are updated
      } else {
        console.error('Setup failed');
        throw new Error('Failed to complete setup');
      }
    } catch (error) {
      console.error('Error during setup:', error);
      toast.error('Failed to complete setup');
    } finally {
      console.log('Setup process completed');
      setIsSubmitting(false);
    }
  };

  // Show loading state only when we're checking auth or loading organization data
  if (isLoading || isAuthenticated === null) {
    console.log('Showing loading state:', { isLoading, isAuthenticated });
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, redirect to auth page
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to auth...');
    return <Navigate to="/auth" replace />;
  }
  
  // If user already has an organisation, redirect to home
  if (hasOrganisation) {
    console.log('User has organization, redirecting to home...');
    return <Navigate to="/" replace />;
  }

  console.log('Showing setup form');
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
                  onChange={(e) => {
                    console.log('Website URL changed:', e.target.value);
                    setWebsiteUrl(e.target.value);
                  }}
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
