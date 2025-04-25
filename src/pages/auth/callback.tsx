import { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// IMPORTANT: Magic Link Authentication Flow
// 1. User clicks magic link in email
// 2. Supabase verifies the link on their end
// 3. Creates a session for the user
// 4. Redirects here with a code parameter
// 5. We DO NOT need to exchange the code - JUST GET THE SESSION!
// 6. BUT we need to wait a moment for Supabase to finish setting up the session

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get parameters from URL - we check these for errors but DON'T use the code!
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

        // CRITICAL: Wait a moment for Supabase to finish setting up the session
        console.log('Waiting for session setup...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Now get the session that Supabase has created
        console.log('Getting established session...');
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Failed to get session:', sessionError);
          throw sessionError;
        }

        // Try a few more times if session isn't ready
        let attempts = 0;
        while (!data.session && attempts < 3) {
          console.log(`Session not ready, retrying... (attempt ${attempts + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retryResult = await supabase.auth.getSession();
          if (retryResult.data.session) {
            console.log('Session found on retry');
            data.session = retryResult.data.session;
            break;
          }
          attempts++;
        }

        if (!data.session) {
          console.error('No session established after retries');
          throw new Error('Authentication failed - no session');
        }

        console.log('Session established successfully:', { 
          user_id: data.session.user.id,
          email: data.session.user.email
        });
        
        // Get user metadata from the session
        const metadata = data.session.user.user_metadata;
        console.log('Processing user metadata:', metadata);

        // Handle organization invites if this was an invite flow
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

        // Update auth context with the new session
        console.log('Updating auth context...');
        await checkAuth();

        // Handle redirect based on whether this was a new invite
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