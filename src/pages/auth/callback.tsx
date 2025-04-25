import { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get parameters from URL
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        console.log('Auth callback initiated:', { 
          hasCode: !!code,
          error,
          errorDescription,
          url: window.location.href,
          pathname: location.pathname,
          search: location.search
        });

        // Handle any errors first
        if (error || errorDescription) {
          console.error('Auth callback received error:', { error, description: errorDescription });
          throw new Error(errorDescription || error || 'Authentication failed');
        }

        if (!code) {
          console.error('Auth callback missing code parameter');
          throw new Error('No authentication code found');
        }

        // Get session using standard auth code flow
        console.log('Starting auth code exchange...');
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Failed to get session:', sessionError);
          throw sessionError;
        }

        if (!data.session) {
          console.error('No session returned after auth');
          throw new Error('Authentication failed - no session');
        }

        console.log('Session established successfully:', { 
          user_id: data.session.user.id,
          email: data.session.user.email
        });
        
        // Get user metadata
        const metadata = data.session.user.user_metadata;
        console.log('Processing user metadata:', metadata);

        // Handle organization invites
        if (metadata?.organisation_id) {
          console.log('Processing organization invite:', { 
            organisation_id: metadata.organisation_id,
            role: metadata.role,
            website_count: metadata.website_ids?.length || 0
          });
          
          const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: data.session.user.email,
            p_organisation_id: metadata.organisation_id,
            p_role: metadata.role || 'member',
            p_website_ids: metadata.website_ids || []
          });

          if (invitationError) {
            console.error('Organization invite processing failed:', invitationError);
            toast.error('Failed to process invitation. Please contact support.');
            throw invitationError;
          }

          console.log('Organization invite processed successfully');
          toast.success(`Welcome to ${metadata.organisationName || 'the organization'}!`);
        }

        // Update auth context
        console.log('Updating auth context...');
        await checkAuth();

        // Handle redirect
        const redirectPath = metadata?.isNewInvite ? '/profile' : '/dashboard';
        console.log('Redirecting user:', { path: redirectPath, isNewInvite: metadata?.isNewInvite });
        
        navigate(redirectPath, { 
          replace: true,
          state: metadata?.isNewInvite ? { 
            newUser: true,
            role: metadata.role,
            message: 'Please set up your password and account preferences.' 
          } : undefined
        });
      } catch (error) {
        console.error('Error in auth callback:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, location, searchParams, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-4">Verifying your access...</h2>
        <p className="text-muted-foreground">Please wait while we set up your account.</p>
      </div>
    </div>
  );
} 