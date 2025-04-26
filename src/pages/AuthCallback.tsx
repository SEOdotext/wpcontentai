import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Auth callback: Processing authentication');
        
        // Get the token from the URL
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        
        console.log('Auth callback: Token present:', !!token);

        if (token) {
          // Exchange the token for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(token);
          console.log('Auth callback: Exchange result:', { success: !!data.session, error: !!error });

          if (error) throw error;

          // Update auth state
          await checkAuth();
          console.log('Auth callback: Auth state updated');

          // Get the next URL or default to dashboard
          const next = searchParams.get('next') || '/dashboard';
          console.log('Auth callback: Redirecting to:', next);
          navigate(next, { replace: true });
        } else {
          console.log('Auth callback: No token found, redirecting to auth');
          navigate('/auth', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback: Error processing authentication:', error);
        navigate('/auth/error', { 
          state: { error: error instanceof Error ? error.message : 'Authentication failed' }
        });
      }
    };

    handleCallback();
  }, [navigate, location.search, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 