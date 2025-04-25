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
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('AuthCallback: Starting authentication process');
      console.log('AuthCallback: Current URL:', window.location.href);
      console.log('AuthCallback: URL parameters:', Object.fromEntries(searchParams.entries()));
      
      try {
        // Verify Supabase client
        if (!supabase?.auth) {
          console.error('AuthCallback: Supabase client not properly initialized');
          toast.error('Authentication service not available');
          navigate('/auth', { replace: true });
          return;
        }

        // Handle email verification flow
        if (token && type === 'signup') {
          console.log('AuthCallback: Email verification token detected');
          
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });
          
          if (verifyError) {
            console.error('AuthCallback: Error verifying email:', verifyError);
            toast.error('Failed to verify email. Please try again.');
            navigate('/auth', { replace: true });
            return;
          }
          
          console.log('AuthCallback: Email verified successfully');
          
          // Check for specific redirect after verification
          const redirectTo = searchParams.get('redirect_to');
          if (redirectTo) {
            console.log('AuthCallback: Redirecting to:', redirectTo);
            window.location.href = redirectTo;
            return;
          }

          // If no redirect, go to dashboard
          navigate('/dashboard', { replace: true });
          return;
        }

        // Let Supabase handle the session automatically
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthCallback: Error getting session:', sessionError);
          toast.error('Authentication failed. Please try logging in again.');
          navigate('/auth', { replace: true });
          return;
        }

        if (!session) {
          console.error('AuthCallback: No session found');
          toast.error('Authentication failed. Please try logging in again.');
          navigate('/auth', { replace: true });
          return;
        }

        console.log('AuthCallback: Successfully obtained session');
        console.log('AuthCallback: User ID:', session.user.id);
        console.log('AuthCallback: User email:', session.user.email);

        // Handle organization invitation if present
        const inviteData = session.user.user_metadata;
        if (inviteData?.organisation_id) {
          console.log('AuthCallback: Found organization data, processing invitation');
          
          const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: session.user.email,
            p_organisation_id: inviteData.organisation_id,
            p_role: inviteData.role || 'member',
            p_website_ids: inviteData.website_ids || []
          });

          if (invitationError) {
            console.error('AuthCallback: Error handling organization invitation:', invitationError);
            toast.error('Failed to process invitation. Please contact support.');
            // Continue anyway since the user is authenticated
          } else {
            console.log('AuthCallback: Successfully processed organization invitation');
          }
        }

        // Verify the session is active
        await checkAuth();
        console.log('AuthCallback: Successfully verified session, redirecting to:', next);
        navigate(next, { replace: true });

      } catch (error) {
        console.error('AuthCallback: Fatal error:', error);
        toast.error('Authentication failed. Please try logging in again.');
        navigate('/auth', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, next, token, type, location.hash, checkAuth, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-4">Setting up your account...</h2>
        <p className="text-muted-foreground">Please wait while we configure your access.</p>
      </div>
    </div>
  );
} 