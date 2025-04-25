import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

// IMPORTANT: Auth Flow
// 1. User clicks link in email
// 2. If admin invite, we verify the token with type 'invite'
// 3. If regular magic link, Supabase handles verification
// 4. In both cases, we end up with a session
// 5. Then we can process organization setup if needed

export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Let Supabase handle the session automatically
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        // Update auth context
        await checkAuth();
        
        // Redirect based on session
        if (session) {
          const redirectPath = session.user.user_metadata?.isNewInvite ? '/profile' : '/dashboard';
          navigate(redirectPath, { replace: true });
        } else {
          navigate('/auth', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback failed:', error);
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, checkAuth]);

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