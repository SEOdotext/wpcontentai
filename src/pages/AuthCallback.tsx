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
      console.log('AuthCallback: Processing authentication callback');
      console.log('AuthCallback: URL:', window.location.href);
      
      try {
        // Try to get the token from different possible locations
        const searchParams = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(location.hash.replace('#', '?'));
        
        // Check for access token first (invitation flow)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresIn = hashParams.get('expires_in');
        const expiresAt = hashParams.get('expires_at');
        
        let session;
        
        if (accessToken) {
          console.log('AuthCallback: Found access token, setting session');
          // Set the session directly
          const { data: { user }, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
            expires_in: parseInt(expiresIn || '3600'),
            expires_at: parseInt(expiresAt || '0')
          });
          
          if (setSessionError) throw setSessionError;
          if (!user) throw new Error('No user data in session');
          
          session = { user };
        } else {
          // Try PKCE code flow
          const code = searchParams.get('code');
          if (code) {
            console.log('AuthCallback: Found code, exchanging for session');
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            session = data;
          }
        }
        
        if (!session) {
          console.log('AuthCallback: No valid auth data found, redirecting to auth');
          navigate('/auth', { replace: true });
          return;
        }

        // Get the type parameter
        const type = searchParams.get('type') || hashParams.get('type');
        console.log('AuthCallback: Auth type:', type);

        // Check if this is an invitation flow
        const invitationData = session.user.user_metadata;
        if (type === 'invite' || invitationData?.organisation_id) {
          console.log('AuthCallback: Processing invitation for organization:', invitationData?.organisation_id);
          
          // Verify organization membership
          const { data: membership, error: membershipError } = await supabase
            .from('organisation_memberships')
            .select('*')
            .eq('member_id', session.user.id)
            .eq('organisation_id', invitationData?.organisation_id)
            .single();

          if (membershipError && membershipError.code !== 'PGRST116') { // PGRST116 is "not found"
            throw membershipError;
          }

          if (!membership && invitationData?.organisation_id) {
            // Create organization membership if it doesn't exist
            const { error: createError } = await supabase
              .from('organisation_memberships')
              .insert({
                organisation_id: invitationData.organisation_id,
                member_id: session.user.id,
                role: invitationData.role || 'member'
              });

            if (createError) throw createError;
            console.log('AuthCallback: Created organization membership');
          }
        }

        // Update auth state
        await checkAuth();
        console.log('AuthCallback: Auth state updated');

        // Get the next URL or default to dashboard
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