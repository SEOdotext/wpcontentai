import { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// IMPORTANT: Auth Flow
// 1. User clicks link in email
// 2. If PKCE token (starts with pkce_), we need to exchange it
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
        console.log('Auth callback starting...');

        // Check if we have a token to exchange
        const token = searchParams.get('token');
        if (token?.startsWith('pkce_')) {
          console.log('Exchanging PKCE token...');
          const pkceCode = token.replace('pkce_', '');
          await supabase.auth.exchangeCodeForSession(pkceCode);
        }

        // Now get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Failed to get session:', sessionError);
          throw sessionError;
        }

        if (!session) {
          console.error('No session found');
          throw new Error('Authentication failed - no session');
        }

        console.log('Session established:', { email: session.user.email });

        // Handle organization setup if needed
        const metadata = session.user.user_metadata;
        if (metadata?.organisation_id) {
          console.log('Setting up organization membership');
          
          const { error: inviteError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: session.user.email,
            p_organisation_id: metadata.organisation_id,
            p_role: metadata.role || 'member',
            p_website_ids: metadata.website_ids || []
          });

          if (inviteError) {
            console.error('Organization setup failed:', inviteError);
            throw inviteError;
          }
        }

        // Update auth context and redirect
        await checkAuth();
        navigate(metadata?.isNewInvite ? '/profile' : '/dashboard', { 
          replace: true,
          state: metadata?.isNewInvite ? {
            newUser: true,
            role: metadata.role,
            message: 'Please set up your password and account preferences.'
          } : undefined
        });

      } catch (error) {
        console.error('Auth callback failed:', error);
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