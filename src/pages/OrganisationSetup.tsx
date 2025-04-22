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
  const [error, setError] = useState('');
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

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed in OrganisationSetup:', session ? 'authenticated' : 'not authenticated');
      setIsAuthenticated(!!session);
    });

    return () => {
      console.log('OrganisationSetup cleanup');
      subscription.unsubscribe();
    };
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

  const isValidDomain = (domain: string) => {
    // Remove http:// or https:// if present for validation
    const cleanDomain = domain.replace(/^https?:\/\//i, '');
    
    // Allow any non-empty string that doesn't contain invalid characters
    // Only block characters that could be used for injection attacks
    const hasInvalidChars = /[<>{}[\]|\\^~`@#$%&*+=]/.test(cleanDomain);
    
    // Allow any non-empty string without invalid characters
    return cleanDomain.length > 0 && !hasInvalidChars;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with URL:', websiteUrl);
    setError('');
    
    if (!websiteUrl.trim()) {
      console.log('Empty website URL submitted');
      setError('Please enter a website URL');
      return;
    }

    if (!isValidDomain(websiteUrl)) {
      console.log('Invalid domain format');
      setError('Please enter a valid website domain (e.g., example.com)');
      return;
    }
    
    console.log('Starting setup process...');
    setIsSubmitting(true);
    
    // Format URL if needed
    let formattedUrl = websiteUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
      console.log('Formatted URL:', formattedUrl);
      setWebsiteUrl(formattedUrl);
    }
    
    try {
      toast.loading('Creating your organization and website...');
      console.log('Calling completeNewUserSetup...');
      const success = await completeNewUserSetup(formattedUrl);
      console.log('Setup result:', success);
      
      if (success) {
        console.log('Setup successful, redirecting to home...');
        toast.success('Setup completed! Redirecting to dashboard...');
        
        // Generate expected website name (should match what's created in the backend)
        const websiteName = websiteUrl
          .replace(/^https?:\/\/(www\.)?/, '')
          .split('.')[0]
          .split(/[-_]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        console.log('Expected website name:', websiteName);
        console.log('Website ID in localStorage:', localStorage.getItem('currentWebsiteId'));
        
        // Add delay to ensure all contexts update
        setTimeout(() => {
          console.log('Refreshing page to activate new organization and website');
          window.location.href = '/'; // Full page refresh to ensure all contexts are updated
        }, 1500);
      } else {
        console.error('Setup failed');
        toast.error('Setup failed. Please try again or contact support.');
        throw new Error('Failed to complete setup');
      }
    } catch (error) {
      console.error('Error during setup:', error);
      toast.error('Failed to complete setup: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
        <title>Setup Your Website | ContentGardener.ai</title>
        <meta name="description" content="Get started with ContentGardener.ai by setting up your website" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Complete Your Setup</CardTitle>
            <CardDescription>
              Enter your website URL to get started with ContentGardener.ai
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="website-url">Website URL</Label>
                <Input
                  id="website-url"
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => {
                    console.log('Website URL changed:', e.target.value);
                    setWebsiteUrl(e.target.value);
                    setError('');
                  }}
                  onBlur={(e) => {
                    // Format the URL when the input loses focus
                    let url = e.target.value.trim();
                    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                      url = 'https://' + url;
                      setWebsiteUrl(url);
                    }
                  }}
                  placeholder="example.com"
                  className={error ? 'border-red-500' : ''}
                  required
                />
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
              </div>
              <div className="flex justify-center">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting || !!error}
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
              </div>
            </form>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    </>
  );
};

export default OrganisationSetup;
