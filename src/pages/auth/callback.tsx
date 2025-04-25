import { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// IMPORTANT: Auth Flow
// 1. User clicks link in email
// 2. If admin invite, we verify the token with type 'invite'
// 3. If regular magic link, Supabase handles verification
// 4. In both cases, we end up with a session
// 5. Then we can process organization setup if needed

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Log all URL parameters
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        const code = searchParams.get('code');
        
        console.log('Auth callback starting with:', {
          hasToken: !!token,
          type,
          hasCode: !!code,
          fullUrl: window.location.href
        });

        // Handle admin invite verification
        if (token && type === 'invite') {
          console.log('Processing organization invite token');
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'invite'
          });

          if (error) {
            console.error('Error verifying invite:', error);
            throw error;
          }

          console.log('Organization invite verified successfully');
        }

        // Try to get the session
        console.log('Attempting to get session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw sessionError;
        }

        if (!sessionData.session) {
          console.error('No session found after verification');
          throw new Error('Authentication failed - no session');
        }

        console.log('Session established successfully:', {
          userId: sessionData.session.user.id,
          email: sessionData.session.user.email,
          hasMetadata: !!sessionData.session.user.user_metadata
        });

        // Handle organization setup if needed
        const metadata = sessionData.session.user.user_metadata;
        console.log('Processing metadata:', metadata);

        if (metadata?.organisation_id) {
          console.log('Setting up organization membership:', {
            orgId: metadata.organisation_id,
            role: metadata.role,
            websiteCount: metadata.website_ids?.length || 0
          });
          
          const { error: inviteError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: sessionData.session.user.email,
            p_organisation_id: metadata.organisation_id,
            p_role: metadata.role || 'member',
            p_website_ids: metadata.website_ids || []
          });

          if (inviteError) {
            console.error('Organization setup failed:', inviteError);
            throw inviteError;
          }

          console.log('Organization setup completed successfully');
        }

        // Update auth context and redirect
        console.log('Updating auth context...');
        await checkAuth();

        const redirectPath = metadata?.isNewInvite ? '/profile' : '/dashboard';
        console.log('Authentication complete, redirecting to:', redirectPath);
        
        navigate(redirectPath, { 
          replace: true,
          state: metadata?.isNewInvite ? {
            newUser: true,
            role: metadata.role,
            message: 'Please set up your password and account preferences.'
          } : undefined
        });

      } catch (error) {
        console.error('Auth callback failed with error:', error);
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