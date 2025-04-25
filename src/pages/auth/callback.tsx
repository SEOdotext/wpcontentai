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
        console.log('Starting callback handling with type:', type);
        
        // Handle email OTP verification for invites
        if (token && type === 'invite') {
          console.log('Processing organization invite token');
          
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'invite'
          });
          
          if (verifyError) {
            console.error('Error verifying invite:', verifyError);
            toast.error('Failed to verify invitation. Please try again.');
            navigate('/auth', { replace: true });
            return;
          }
          
          console.log('Organization invite token verified successfully');
        }

        // Get the current session after OTP verification
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }
        
        if (!session) {
          console.error('No session found after verification');
          toast.error('Verification failed. Please try again.');
          navigate('/auth', { replace: true });
          return;
        }

        console.log('Session established successfully');

        // Process organization invitation from the user metadata
        const inviteData = session.user.user_metadata;
        if (inviteData?.organisation_id) {
          console.log('Processing organization membership');
          
          const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: session.user.email,
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

        // Update auth state with the new session
        await checkAuth();
        
        // For new users, go to profile setup
        if (type === 'invite') {
          navigate('/profile', { 
            replace: true,
            state: { 
              newUser: true,
              message: 'Please set up your password and account preferences.' 
            }
          });
        } else {
          // For existing users, go to dashboard or next page
          navigate(next, { replace: true });
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