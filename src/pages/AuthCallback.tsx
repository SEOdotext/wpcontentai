import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('AuthCallback: Starting authentication callback processing');
      console.log('AuthCallback: Current URL:', window.location.href);
      console.log('AuthCallback: Search params:', location.search);
      console.log('AuthCallback: Hash:', location.hash);
      
      try {
        // Parse URL parameters
        const searchParams = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(location.hash.replace('#', '?'));
        
        console.log('AuthCallback: Search parameters:', Object.fromEntries(searchParams.entries()));
        console.log('AuthCallback: Hash parameters:', Object.fromEntries(hashParams.entries()));
        
        // Check for access token first (invitation flow)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresIn = hashParams.get('expires_in');
        const expiresAt = hashParams.get('expires_at');
        
        console.log('AuthCallback: Auth tokens found:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          expiresIn,
          expiresAt
        });
        
        let session;
        
        if (accessToken) {
          console.log('AuthCallback: Using access token flow');
          // Set the session directly
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (setSessionError) {
            console.error('AuthCallback: Error setting session:', setSessionError);
            throw setSessionError;
          }
          
          console.log('AuthCallback: Session set successfully:', {
            hasUser: !!data.user,
            hasSession: !!data.session
          });
          
          if (!data.user) throw new Error('No user data in session');
          session = { user: data.user };
        } else {
          // Try PKCE code flow
          const code = searchParams.get('code');
          console.log('AuthCallback: Attempting PKCE code flow:', { hasCode: !!code });
          
          if (code) {
            console.log('AuthCallback: Exchanging code for session');
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('AuthCallback: Error exchanging code:', error);
              throw error;
            }
            console.log('AuthCallback: Code exchange successful');
            session = data;
          }
        }
        
        if (!session) {
          console.log('AuthCallback: No valid auth data found');
          navigate('/auth', { replace: true });
          return;
        }

        // Get the type parameter and check invitation flow
        const type = searchParams.get('type') || hashParams.get('type');
        console.log('AuthCallback: Auth type:', type);
        
        const invitationData = session.user.user_metadata;
        console.log('AuthCallback: User metadata:', invitationData);

        if (type === 'invite' || invitationData?.organisation_id) {
          console.log('AuthCallback: Processing invitation flow:', {
            type,
            organisationId: invitationData?.organisation_id,
            role: invitationData?.role
          });
          
          // Verify organization membership
          const { data: membership, error: membershipError } = await supabase
            .from('organisation_memberships')
            .select('*')
            .eq('member_id', session.user.id)
            .eq('organisation_id', invitationData?.organisation_id)
            .single();

          console.log('AuthCallback: Membership check result:', {
            hasMembership: !!membership,
            error: membershipError?.code
          });

          if (membershipError && membershipError.code !== 'PGRST116') {
            console.error('AuthCallback: Error checking membership:', membershipError);
            throw membershipError;
          }

          if (!membership && invitationData?.organisation_id) {
            console.log('AuthCallback: Creating new membership');
            // Create organization membership
            const { error: createError } = await supabase
              .from('organisation_memberships')
              .insert({
                organisation_id: invitationData.organisation_id,
                member_id: session.user.id,
                role: invitationData.role || 'member'
              });

            if (createError) {
              console.error('AuthCallback: Error creating membership:', createError);
              throw createError;
            }
            console.log('AuthCallback: Membership created successfully');
          }
        }

        // Update auth state
        console.log('AuthCallback: Updating auth state');
        await checkAuth();
        console.log('AuthCallback: Auth state updated');

        // Handle redirect
        const next = searchParams.get('next') || hashParams.get('next') || '/dashboard';
        console.log('AuthCallback: Redirecting to:', next);
        navigate(next, { replace: true });
      } catch (err) {
        console.error('AuthCallback: Error processing authentication:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        navigate('/auth/error', { 
          state: { error: err instanceof Error ? err.message : 'Authentication failed' }
        });
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [navigate, location.search, location.hash, location.pathname, checkAuth]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Processing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Authentication Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => navigate('/auth')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback; 