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
        // Get URL parameters
        const code = searchParams.get('code');
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        console.log('Auth callback starting...', {
          hasCode: !!code,
          hasToken: !!token,
          type,
          hasError: !!error,
          url: window.location.href
        });

        // Handle any errors first
        if (error || errorDescription) {
          console.error('Auth error received:', { error, description: errorDescription });
          throw new Error(errorDescription || error || 'Authentication failed');
        }

        let session;

        // If we have a PKCE token, we need to exchange it
        if (token?.startsWith('pkce_')) {
          console.log('Processing PKCE token...');
          const pkceCode = token.replace('pkce_', '');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(pkceCode);
          
          if (exchangeError) {
            console.error('PKCE exchange failed:', exchangeError);
            throw exchangeError;
          }

          session = data.session;
        } else {
          // Regular magic link flow - wait for session setup
          console.log('Waiting for magic link session setup...');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Try to get session
          let attempts = 0;
          const maxAttempts = 3;

          while (!session && attempts < maxAttempts) {
            console.log(`Attempting to get session (${attempts + 1}/${maxAttempts})...`);
            const { data, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error(`Session fetch error on attempt ${attempts + 1}:`, sessionError);
              throw sessionError;
            }

            if (data?.session) {
              console.log('Session found!');
              session = data.session;
              break;
            }

            console.log('No session yet, waiting...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }

        if (!session) {
          console.error('Failed to establish session');
          throw new Error('Authentication failed - no session');
        }

        console.log('Session established:', {
          user_id: session.user.id,
          email: session.user.email
        });

        // Process metadata and handle organization setup
        const metadata = session.user.user_metadata;
        console.log('Processing session metadata:', metadata);

        if (metadata?.organisation_id) {
          console.log('Setting up organization membership:', {
            org_id: metadata.organisation_id,
            role: metadata.role
          });

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

          console.log('Organization setup complete');
        }

        // Update auth context
        await checkAuth();

        // Handle redirect
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