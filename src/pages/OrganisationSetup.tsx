import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Globe } from 'lucide-react';
import { useOrganisation } from '@/context/OrganisationContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

const OrganisationSetup = () => {
  const navigate = useNavigate();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { completeNewUserSetup, hasOrganisation, isLoading: orgLoading } = useOrganisation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isProcessingOnboarding, setIsProcessingOnboarding] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  // Combined check for auth and onboarding data
  useEffect(() => {
    let mounted = true;
    let authCheckTimeout: NodeJS.Timeout;
    
    const initialize = async () => {
      try {
        // Start auth check timeout
        authCheckTimeout = setTimeout(() => {
          if (mounted && !isAuthenticated) {
            console.log('Auth check timeout reached, redirecting to auth');
            navigate('/auth', { replace: true });
          }
        }, 10000); // 10 second timeout for auth check

        // Check auth first
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (session) {
          setIsAuthenticated(true);
          
          // Check for onboarding data
          const websiteInfo = localStorage.getItem('website_info');
          const onboardingData = localStorage.getItem('onboardingWebsite');
          
          if (websiteInfo || onboardingData) {
            setIsProcessingOnboarding(true);
            try {
              const savedData = websiteInfo ? JSON.parse(websiteInfo) : { url: onboardingData };
              const url = savedData.url || '';
              
              if (url) {
                setWebsiteUrl(url);
                // Wait a bit for organization context to initialize
                await new Promise(resolve => setTimeout(resolve, 1000));
                await handleSetup(url);
              }
            } catch (error) {
              console.error('Error processing onboarding data:', error);
              toast.error('Error processing saved data');
            } finally {
              if (mounted) setIsProcessingOnboarding(false);
            }
          }
        } else {
          setIsAuthenticated(false);
          navigate('/auth', { replace: true });
        }
      } catch (error) {
        console.error('Initialization error:', error);
        if (mounted) {
          setIsAuthenticated(false);
          toast.error('Error initializing setup');
        }
      } finally {
        if (mounted) {
          setInitialCheckComplete(true);
          clearTimeout(authCheckTimeout);
        }
      }
    };

    initialize();

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event);
      setIsAuthenticated(!!session);
      
      if (!session) {
        navigate('/auth', { replace: true });
      }
    });

    return () => {
      mounted = false;
      clearTimeout(authCheckTimeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

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
    
    // Basic domain validation regex
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(cleanDomain);
  };

  const handleSetup = async (url: string) => {
    console.log('Starting setup process with URL:', url);
    setIsSubmitting(true);
    
    try {
      toast.loading('Creating your organization and website...');
      const success = await completeNewUserSetup(url);
      
      if (success) {
        toast.success('Setup completed! Redirecting to dashboard...');
        
        // Clear onboarding data
        localStorage.removeItem('website_info');
        localStorage.removeItem('onboardingWebsite');
        
        // Redirect with a delay to ensure state updates
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        throw new Error('Failed to complete setup');
      }
    } catch (error) {
      console.error('Error during setup:', error);
      toast.error('Failed to complete setup: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!websiteUrl.trim()) {
      setError('Please enter a website URL');
      return;
    }

    // Format URL if needed
    let formattedUrl = websiteUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
      setWebsiteUrl(formattedUrl);
    }
    
    await handleSetup(formattedUrl);
  };

  // Update the loading condition to account for organization loading
  if (!initialCheckComplete || (orgLoading && !isProcessingOnboarding)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Setting up your workspace...</p>
          <p className="text-sm text-muted-foreground">This may take a few moments</p>
        </div>
      </div>
    );
  }

  // If user already has an organisation and we're not processing onboarding data, redirect to home
  if (hasOrganisation && !isProcessingOnboarding) {
    return <Navigate to="/" replace />;
  }

  // Show the setup form
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
                <Label htmlFor="website">Website URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="pl-9"
                    placeholder="example.com"
                    disabled={isSubmitting}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
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
                  'Complete Setup'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default OrganisationSetup;
