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

        // Get the token from the URL
        const token = searchParams.get('token') || '';
        const type = searchParams.get('type');
        const refreshToken = searchParams.get('refresh_token');

        console.log('Processing auth callback:', { type, hasToken: !!token, hasRefreshToken: !!refreshToken });

        // If we have a token, we need to verify it
        if (token) {
          console.log('Verifying token...');
          
          // First try to verify the token
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'magiclink'
          });

          if (verifyError) {
            console.error('Token verification failed:', verifyError);
            throw verifyError;
          }

          console.log('Token verification successful:', !!verifyData?.user);
        }

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw sessionError;
        }

        if (!session) {
          console.error('No session found after verification');
          throw new Error('Authentication failed - no session');
        }

        console.log('Session established successfully');

        // Get user metadata
        const metadata = session.user.user_metadata;
        console.log('User metadata:', metadata);

        // Handle organization invites
        if (metadata?.organisation_id) {
          console.log('Processing organization invite');
          
          const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: session.user.email,
            p_organisation_id: metadata.organisation_id,
            p_role: metadata.role || 'member',
            p_website_ids: metadata.website_ids || []
          });

          if (invitationError) {
            console.error('Error processing organization invite:', invitationError);
            toast.error('Failed to process invitation. Please contact support.');
          } else {
            console.log('Organization invite processed successfully');
            toast.success('Welcome! Your account has been set up.');
          }
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