import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const code = searchParams.get('code');

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        // First check if we have a code to exchange
        if (code) {
          console.log('AuthCallback: Exchanging OTP code for session');
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: code,
            type: 'email'
          });

          if (verifyError) {
            console.error('Error verifying OTP:', verifyError);
            throw verifyError;
          }

          if (!verifyData.session) {
            console.error('No session returned from OTP verification');
            throw new Error('No session returned from OTP verification');
          }

          // Get the invitation data from the session
          const inviteData = verifyData.session.user.user_metadata;
          
          if (inviteData?.organisation_id) {
            console.log('AuthCallback: Handling organization invitation');
            // Handle organization setup through RPC
            const { error: invitationError } = await supabase
              .rpc('handle_organisation_invitation', {
                p_email: verifyData.session.user.email,
                p_organisation_id: inviteData.organisation_id,
                p_role: inviteData.role || 'member',
                p_website_ids: inviteData.website_ids || []
              });

            if (invitationError) throw invitationError;
          }

          // Redirect to the next page (usually dashboard)
          navigate(next);
          return;
        }

        // If no code, check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session) {
          // Get the invitation data from the session
          const inviteData = session.user.user_metadata;
          
          if (inviteData?.organisation_id) {
            // Handle organization setup through RPC
            const { error: invitationError } = await supabase
              .rpc('handle_organisation_invitation', {
                p_email: session.user.email,
                p_organisation_id: inviteData.organisation_id,
                p_role: inviteData.role || 'member',
                p_website_ids: inviteData.website_ids || []
              });

            if (invitationError) throw invitationError;
          }

          // Redirect to the next page (usually dashboard)
          navigate(next);
        } else {
          // No session and no code, redirect to auth
          console.log('AuthCallback: No valid token found in URL, redirecting to auth page');
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        toast.error('Failed to complete signup');
        navigate('/auth/error');
      }
    };

    handleAuthCallback();
  }, [navigate, next, code]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Setting up your account...</h2>
        <p className="text-muted-foreground">Please wait while we configure your access.</p>
      </div>
    </div>
  );
} 