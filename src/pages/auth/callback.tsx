import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();
  const next = searchParams.get('next') || '/dashboard';
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // First check if we have an existing session (returning user)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        // Handle email OTP verification for new users
        if (token && type === 'signup') {
          console.log('Processing email verification token for new user');
          
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });
          
          if (verifyError) {
            console.error('Error verifying email:', verifyError);
            toast.error('Failed to verify email. Please try again.');
            navigate('/auth', { replace: true });
            return;
          }
          
          console.log('Email verified successfully');
        }

        // Get the current session (either existing or newly created from OTP)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (!session) {
          console.log('No session found after verification, redirecting to login');
          navigate('/auth', { replace: true });
          return;
        }

        // Process organization invitation from the user metadata
        const inviteData = session.user.user_metadata;
        if (inviteData?.organisation_id) {
          console.log('Processing organization invitation with role:', inviteData.role);
          
          // For admins, we don't need to wait for invitation processing
          // The database policy will allow immediate access
          if (inviteData.role === 'admin') {
            console.log('Admin user detected, updating auth state');
            await checkAuth();
            toast.success('Welcome! You now have admin access.');
            navigate(next, { replace: true });
            return;
          }

          // For members, process the invitation
          const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: session.user.email,
            p_organisation_id: inviteData.organisation_id,
            p_role: inviteData.role || 'member',
            p_website_ids: inviteData.website_ids || []
          });

          if (invitationError) {
            console.error('Error processing invitation:', invitationError);
            toast.error('Failed to process invitation. Please contact support.');
          } else {
            console.log('Successfully processed organization invitation');
            if (existingSession) {
              toast.success('You have been added to the organization.');
            } else {
              toast.success('Welcome! Your account is now set up.');
            }
          }
        }

        // Update auth state with the new session
        await checkAuth();
        
        // Different redirects for new vs existing users
        if (existingSession) {
          // Existing user - go to dashboard or next page
          navigate(next, { replace: true });
        } else {
          // New user - go to profile setup
          navigate('/profile', { 
            replace: true,
            state: { 
              newUser: true,
              message: 'Please set up your password and account preferences.' 
            }
          });
        }
      } catch (error) {
        console.error('Error during verification:', error);
        toast.error('Verification failed. Please try again.');
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, token, type, checkAuth, next]);

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