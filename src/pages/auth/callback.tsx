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

        // Get the code from the URL
        const code = searchParams.get('code');
        
        console.log('Processing auth callback:', { hasCode: !!code });

        // If we have a code, we need to exchange it for a session
        if (code) {
          console.log('Processing auth code...');
          
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('Code exchange failed:', error);
            throw error;
          }

          if (!data.session) {
            console.error('No session returned from code exchange');
            throw new Error('Authentication failed - no session');
          }

          console.log('Code exchange successful:', !!data.session);
          
          // Get user metadata
          const metadata = data.session.user.user_metadata;
          console.log('User metadata:', metadata);

          // Handle organization invites
          if (metadata?.organisation_id) {
            console.log('Processing organization invite');
            
            const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
              p_email: data.session.user.email,
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
        } else {
          console.error('No auth code found in URL');
          throw new Error('No authentication code found');
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