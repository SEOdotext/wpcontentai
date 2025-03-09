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

const OrganisationSetup = () => {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createOrganisation, hasOrganisation, isLoading } = useOrganisation();
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
    
    if (!websiteUrl.trim() || !websiteName.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      // First create organization using website name as base
      const orgName = generateOrgName(websiteUrl);
      const success = await createOrganisation(orgName);
      
      if (!success) {
        throw new Error('Failed to create organisation');
      }

      // Get the newly created organization
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No session found');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('organisation_id')
        .eq('id', sessionData.session.user.id)
        .single();

      if (profileError || !profileData?.organisation_id) {
        throw new Error('Could not find organization ID');
      }

      // Then create the website
      const { error: websiteError } = await supabase
        .from('websites')
        .insert({
          url: websiteUrl.trim(),
          name: websiteName.trim(),
          organisation_id: profileData.organisation_id
        })
        .select()
        .single();

      if (websiteError) {
        throw websiteError;
      }

      toast.success('Setup completed successfully');
      window.location.href = '/'; // Full page refresh to ensure all contexts are updated
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">Welcome to Your Content Platform</CardTitle>
            <CardDescription>
              Let's get started by adding your website
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="websiteName" className="text-center block">Website Name</Label>
              <Input
                id="websiteName"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder="Enter your website name"
                className="text-center"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="text-center block">Website URL</Label>
              <Input
                id="websiteUrl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                type="url"
                className="text-center"
                required
              />
              <p className="text-sm text-muted-foreground text-center">
                Your organization will be created automatically based on your website name
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      <Toaster />
    </div>
  );
};

export default OrganisationSetup;
