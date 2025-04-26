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
      
      try {
        // Get the token from the URL
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        
        if (!token) {
          console.log('AuthCallback: No token found, redirecting to auth');
          navigate('/auth', { replace: true });
          return;
        }

        // Exchange the token for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(token);
        console.log('AuthCallback: Exchange result:', { success: !!data.session, error: !!error });

        if (error) throw error;

        // Update auth state
        await checkAuth();
        console.log('AuthCallback: Auth state updated');

        // Get the next URL or default to dashboard
        const next = searchParams.get('next') || '/dashboard';
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
  }, [navigate, location.search, checkAuth]);

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