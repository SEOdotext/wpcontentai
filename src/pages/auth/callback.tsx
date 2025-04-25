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
        console.log('Starting callback handler with token:', token, 'type:', type);
        
        // Handle email OTP verification for new users
        if (token && type === 'signup') {
          console.log('Processing email verification token');
          
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });
          
          if (verifyError) {
            console.error('Error verifying email:', verifyError);
            toast.error('Failed to verify email. Please try again.');
            navigate('/auth', { replace: true });
            return;
          }
          
          console.log('Email verified successfully:', verifyData);
        }

        // Wait a moment for the session to be established
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw sessionError;
        }
        
        if (!session) {
          console.error('No session found after verification');
          toast.error('Unable to establish session. Please try logging in again.');
          navigate('/auth', { replace: true });
          return;
        }

        console.log('Session established:', session.user.id);
        console.log('User metadata:', session.user.user_metadata);

        // Process organization invitation from the user metadata
        const inviteData = session.user.user_metadata;
        if (inviteData?.organisation_id) {
          console.log('Processing organization invitation:', {
            email: session.user.email,
            organisationId: inviteData.organisation_id,
            role: inviteData.role,
            websiteIds: inviteData.website_ids
          });
          
          const { data: inviteResult, error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: session.user.email,
            p_organisation_id: inviteData.organisation_id,
            p_role: inviteData.role || 'member',
            p_website_ids: inviteData.website_ids || []
          });

          if (invitationError) {
            console.error('Error processing invitation:', invitationError);
            toast.error('Failed to process invitation. Please contact support.');
          } else {
            console.log('Organization invitation processed:', inviteResult);
            
            if (inviteData.role === 'admin') {
              toast.success('Welcome! Your admin account has been set up.');
            } else {
              toast.success('Welcome! Your account has been set up.');
            }
          }
        }

        // Update auth state
        await checkAuth();
        
        // Redirect based on role
        if (inviteData?.role === 'admin') {
          console.log('Redirecting admin to team management');
          navigate('/team', { 
            replace: true,
            state: { 
              newAdmin: true,
              message: 'Welcome! You can manage your team here.' 
            }
          });
        } else {
          console.log('Redirecting member to profile setup');
          navigate('/profile', { 
            replace: true,
            state: { 
              newUser: true,
              message: 'Please set up your password and account preferences.' 
            }
          });
        }
      } catch (error) {
        console.error('Error in callback handler:', error);
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