import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const code = searchParams.get('code');
  const token = searchParams.get('token'); // Check if user is trying to use Supabase URL directly

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('AuthCallback: Starting authentication process');
      console.log('AuthCallback: URL parameters:', Object.fromEntries(searchParams.entries()));
      
      try {
        // Check if user is trying to use the Supabase URL directly
        if (token && token.startsWith('pkce_')) {
          console.error('AuthCallback: Direct Supabase URL access detected');
          toast.error('Please click the link in your email instead of copying it');
          navigate('/auth');
          return;
        }

        if (!code) {
          console.log('AuthCallback: No code found in URL');
          navigate('/auth');
          return;
        }

        console.log('AuthCallback: Found code, attempting to exchange for session');
        
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('AuthCallback: Error exchanging code for session:', error);
          throw error;
        }

        if (!data?.session) {
          console.error('AuthCallback: No session returned from code exchange');
          throw new Error('No session returned from code exchange');
        }

        console.log('AuthCallback: Successfully obtained session');
        console.log('AuthCallback: User ID:', data.session.user.id);
        console.log('AuthCallback: User email:', data.session.user.email);

        // Handle organization invitation if present
        const inviteData = data.session.user.user_metadata;
        if (inviteData?.organisation_id) {
          console.log('AuthCallback: Found organization data, processing invitation');
          
          const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: data.session.user.email,
            p_organisation_id: inviteData.organisation_id,
            p_role: inviteData.role || 'member',
            p_website_ids: inviteData.website_ids || []
          });

          if (invitationError) {
            console.error('AuthCallback: Error handling organization invitation:', invitationError);
            throw invitationError;
          }

          console.log('AuthCallback: Successfully processed organization invitation');
        }

        console.log('AuthCallback: Verified session exists, redirecting to:', next);
        navigate(next);
      } catch (error) {
        console.error('AuthCallback: Fatal error:', error);
        toast.error('Failed to complete signup. Please try clicking the link in your email again.');
        navigate('/auth/error');
      }
    };

    handleAuthCallback();
  }, [navigate, next, code, searchParams, token]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Setting up your account...</h2>
        <p className="text-muted-foreground">Please wait while we configure your access.</p>
      </div>
    </div>
  );
} 