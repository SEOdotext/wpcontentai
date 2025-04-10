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
      console.log('AuthCallback: Current URL:', window.location.href);
      
      try {
        // Check if we have a verification token in the URL
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        console.log('AuthCallback: URL parameters:', { 
          token: token ? 'present' : 'missing', 
          type: type || 'missing',
          hash: window.location.hash ? 'present' : 'missing'
        });
        
        if (token && type === 'signup') {
          console.log('AuthCallback: Email verification token detected');
          
          // Verify the email
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });
          
          if (verifyError) {
            console.error('AuthCallback: Error verifying email:', verifyError);
            setError(verifyError.message);
            return;
          }
          
          console.log('AuthCallback: Email verified successfully');
          
          // After verification, check if we need to redirect
          const redirectTo = searchParams.get('redirect_to');
          if (redirectTo) {
            console.log('AuthCallback: Redirecting to:', redirectTo);
            window.location.href = redirectTo;
            return;
          }
        }
        
        // Get the hash fragment from the URL
        const hash = window.location.hash;
        
        // Check if we have a token in the URL
        if (hash.includes('access_token=') || hash.includes('type=signup')) {
          console.log('AuthCallback: Token detected in URL, processing authentication');
          
          // Let Supabase handle the token
          const { error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('AuthCallback: Error processing authentication:', error);
            setError(error.message);
            return;
          }
          
          // Check authentication status
          await checkAuth();
          
          console.log('AuthCallback: Authentication successful, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          // If we have a token but no hash, we might need to exchange it
          if (token) {
            console.log('AuthCallback: Token found but no hash, attempting to exchange token');
            
            // Try to exchange the token for a session
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(token);
            
            if (exchangeError) {
              console.error('AuthCallback: Error exchanging token:', exchangeError);
              setError(exchangeError.message);
              return;
            }
            
            if (data.session) {
              console.log('AuthCallback: Token exchanged successfully, redirecting to dashboard');
              navigate('/dashboard', { replace: true });
              return;
            }
          }
          
          console.log('AuthCallback: No valid token found in URL, redirecting to auth page');
          navigate('/auth', { replace: true });
        }
      } catch (err) {
        console.error('AuthCallback: Unexpected error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [navigate, checkAuth, location]);

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