import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Separator } from "@/components/ui/separator";
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { Alert, AlertDescription } from "@/components/ui/alert";

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    // Show the form quickly no matter what
    const formTimeout = setTimeout(() => {
      setIsCheckingAuth(false);
    }, 500);

    const checkAuth = async () => {
      try {
        console.log('Auth: Checking if user is already logged in');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth: Session error:', error);
          setIsCheckingAuth(false);
          return;
        }
        
        if (data.session) {
          console.log('Auth: User is already authenticated, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
          return;
        }
        
        console.log('Auth: No active session, showing login form');
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Auth: Error checking auth:', error);
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth: Auth state changed, event:', _event, 'session:', session ? 'exists' : 'null', 'session ID:', session?.user?.id);
      
      if (session && (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED')) {
        console.log('Auth: User authenticated, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    });
    
    return () => {
      clearTimeout(formTimeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Check URL parameters for signup mode or errors
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const signupParam = query.get('signup');
    if (signupParam === 'true') {
      setMode('signup');
    }

    const error = query.get('error');
    const errorDescription = query.get('error_description');
    
    if (error && errorDescription) {
      setAuthError(decodeURIComponent(errorDescription));
      toast.error('Authentication failed', {
        description: decodeURIComponent(errorDescription),
      });
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast.success('Check your email to confirm your account');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast.success('Successfully logged in');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setAuthError(null);

    if (!email) {
      setAuthError('Please enter your email address');
      setResetLoading(false);
      return;
    }
    
    try {
      console.log(`Attempting password reset for: ${email}`);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: import.meta.env.DEV 
          ? 'http://localhost:8080/auth/reset-password' 
          : `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
      
      toast.success('Password reset email sent', {
        description: 'Check your email for the password reset link',
      });
      
      setMode('login');
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      setAuthError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setAuthError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: import.meta.env.DEV ? 'http://localhost:8080/dashboard' : `${window.location.origin}/dashboard`
        }
      });
      
      if (error) throw error;
      
      // No need to navigate as the OAuth flow will redirect automatically
    } catch (error) {
      console.error('Google sign-in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      setAuthError(errorMessage);
      toast.error(errorMessage);
      setGoogleLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Password reset view
  if (mode === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {authError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handlePasswordReset} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-10"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full flex items-center justify-center gap-2 h-10" 
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span>{resetLoading ? 'Sending...' : 'Send Reset Link'}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setMode('login')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Login</span>
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{mode === 'login' ? 'Login' : 'Sign Up'}</CardTitle>
          <CardDescription className="text-center">
            {mode === 'login' 
              ? 'Enter your credentials to access your account' 
              : 'Create a new account to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {authError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 h-10" 
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FcGoogle className="h-5 w-5" />
              )}
              <span>{mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
            </Button>
            
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">
                  OR
                </span>
              </div>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-10"
                  required
                />
                {mode === 'login' && (
                  <div className="text-right">
                    <Button 
                      type="button" 
                      variant="link" 
                      className="text-xs p-0 h-auto"
                      onClick={() => setMode('reset')}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2 h-10" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                <span>{isLoading ? 'Please wait...' : mode === 'login' ? 'Login with Email' : 'Sign Up with Email'}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
