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
  const next = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the full hash from the URL
        const hashParams = new URLSearchParams(location.hash.substring(1));
        console.log('Callback params:', {
          hash: hashParams.toString(),
          search: location.search,
          type: searchParams.get('type')
        });

        // Check if we have a hash with access_token (OAuth flow)
        if (location.hash && hashParams.get('access_token')) {
          console.log('Processing OAuth callback');
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) throw error;
          if (!session) {
            console.error('No session found after OAuth');
            throw new Error('Authentication failed');
          }
          
          await handleSuccessfulAuth(session);
          return;
        }

        // Handle email OTP verification
        if (searchParams.get('type') === 'invite') {
          console.log('Processing organization invite');
          
          // Get the current session first
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          
          if (!existingSession) {
            console.error('No session found for invite verification');
            toast.error('Invitation verification failed. Please try again.');
            navigate('/auth', { replace: true });
            return;
          }

          // Process organization invitation from the user metadata
          const inviteData = existingSession.user.user_metadata;
          if (inviteData?.organisation_id) {
            console.log('Processing organization membership', inviteData);
            
            const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
              p_email: existingSession.user.email,
              p_organisation_id: inviteData.organisation_id,
              p_role: inviteData.role || 'member',
              p_website_ids: inviteData.website_ids || []
            });

            if (invitationError) {
              console.error('Error processing organization membership:', invitationError);
              toast.error('Failed to process invitation. Please contact support.');
            } else {
              console.log('Successfully processed organization membership');
              toast.success('Welcome! Your account has been set up.');
            }
          }

          // Update auth state and redirect
          await checkAuth();
          navigate('/profile', { 
            replace: true,
            state: { 
              newUser: true,
              message: 'Please set up your password and account preferences.' 
            }
          });
          return;
        }

        // If we get here without handling any auth flow, something went wrong
        console.error('No valid authentication flow detected');
        toast.error('Authentication failed. Please try again.');
        navigate('/auth', { replace: true });
      } catch (error) {
        console.error('Error during callback:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/auth', { replace: true });
      }
    };

    const handleSuccessfulAuth = async (session: any) => {
      console.log('Authentication successful, processing session');
      
      // Update auth state
      await checkAuth();
      
      // Process any organization data if present
      const userData = session.user.user_metadata;
      if (userData?.organisation_id) {
        console.log('Processing organization data from session');
        
        const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
          p_email: session.user.email,
          p_organisation_id: userData.organisation_id,
          p_role: userData.role || 'member',
          p_website_ids: userData.website_ids || []
        });

        if (invitationError) {
          console.error('Error processing organization data:', invitationError);
          toast.error('Failed to process organization data. Please contact support.');
        }
      }

      // Redirect based on the flow
      if (userData?.newUser) {
        navigate('/profile', { 
          replace: true,
          state: { 
            newUser: true,
            message: 'Please set up your password and account preferences.' 
          }
        });
      } else {
        navigate(next, { replace: true });
      }
    };

    handleCallback();
  }, [navigate, location, checkAuth, next]);

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