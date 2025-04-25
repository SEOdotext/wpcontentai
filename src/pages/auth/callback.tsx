import { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// IMPORTANT: Magic Link Authentication Flow
// 1. User clicks magic link in email
// 2. Supabase verifies the link on their end
// 3. Creates a session for the user
// 4. Redirects here with a code parameter
// 5. We DO NOT need to exchange the code - JUST GET THE SESSION!
// 6. BUT we need to wait a moment for Supabase to finish setting up the session

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Log initial state
        console.log('Auth callback starting...', {
          url: window.location.href,
          hasCode: !!searchParams.get('code'),
          hasError: !!searchParams.get('error')
        });

        // Check for errors
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error || errorDescription) {
          console.error('Auth error received:', { error, description: errorDescription });
          throw new Error(errorDescription || error || 'Authentication failed');
        }

        // Wait for session setup
        console.log('Waiting for Supabase session setup...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to get session
        let session = null;
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

        if (!session) {
          console.error(`No session found after ${maxAttempts} attempts`);
          throw new Error('Failed to establish session');
        }

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