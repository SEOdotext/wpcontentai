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
        // Log all URL parameters for debugging
        console.log('Auth callback URL info:', {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
          params: Object.fromEntries(searchParams.entries())
        });

        // Get the token and type from the URL
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        const code = searchParams.get('code');
        
        console.log('Processing auth callback:', { hasToken: !!token, type, hasCode: !!code });

        let session;

        // If we have a PKCE token, extract the code from it
        if (token?.startsWith('pkce_')) {
          console.log('Processing PKCE token...');
          // The code is the token without the pkce_ prefix
          const pkceCode = token.replace('pkce_', '');
          
          // Exchange the PKCE code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(pkceCode);

          if (error) {
            console.error('PKCE code exchange failed:', error);
            throw error;
          }

          session = data.session;
          console.log('PKCE code exchange successful:', !!session);
        } else if (token && type === 'magiclink') {
          console.log('Processing magic link verification...');
          
          // Verify the magic link
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'magiclink'
          });

          if (verifyError) {
            console.error('Magic link verification failed:', verifyError);
            throw verifyError;
          }

          console.log('Magic link verification successful:', !!verifyData?.user);
          
          // Get the session after verification
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          session = sessionData.session;
        } else if (code) {
          console.log('Processing auth code...');
          
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('Code exchange failed:', error);
            throw error;
          }

          session = data.session;
          console.log('Code exchange successful:', !!session);
        } else {
          console.error('No valid authentication parameters found');
          throw new Error('Invalid authentication parameters');
        }

        if (!session) {
          console.error('No session established');
          throw new Error('Authentication failed - no session');
        }

        console.log('Session established successfully');
        
        // Get user metadata
        const metadata = session.user.user_metadata;
        console.log('User metadata:', metadata);

        // Handle organization invites
        if (metadata?.organisation_id) {
          console.log('Processing organization invite with metadata:', metadata);
          
          const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: session.user.email,
            p_organisation_id: metadata.organisation_id,
            p_role: metadata.role || 'member',
            p_website_ids: metadata.website_ids || []
          });

          if (invitationError) {
            console.error('Error processing organization invite:', invitationError);
            toast.error('Failed to process invitation. Please contact support.');
            throw invitationError;
          }

          console.log('Organization invite processed successfully');
          toast.success(`Welcome to ${metadata.organisationName || 'the organization'}!`);
        }

        // Update auth context
        await checkAuth();

        // Redirect based on metadata
        if (metadata?.isNewInvite) {
          navigate('/profile', { 
            replace: true,
            state: { 
              newUser: true,
              role: metadata.role,
              message: 'Please set up your password and account preferences.' 
            }
          });
        } else {
          navigate('/dashboard', { replace: true });
        }
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