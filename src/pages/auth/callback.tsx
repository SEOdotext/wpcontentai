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
    const handleAuthCallback = async () => {
      try {
        if (!code) {
          console.log('No code found in URL');
          navigate('/auth');
          return;
        }

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('Error exchanging code for session:', error);
          throw error;
        }

        if (!data.session) {
          throw new Error('No session returned from code exchange');
        }

        // Handle organization invitation if present
        const inviteData = data.session.user.user_metadata;
        if (inviteData?.organisation_id) {
          const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: data.session.user.email,
            p_organisation_id: inviteData.organisation_id,
            p_role: inviteData.role || 'member',
            p_website_ids: inviteData.website_ids || []
          });

          if (invitationError) throw invitationError;
        }

        // Redirect to the next page
        navigate(next);
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