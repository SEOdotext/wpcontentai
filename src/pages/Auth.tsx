import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Separator } from "@/components/ui/separator";
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuth();

  useEffect(() => {
    console.log('Auth: Component mounted, checking URL parameters');
    // Check for signup parameter in URL
    const query = new URLSearchParams(window.location.search);
    const signupParam = query.get('signup');
    if (signupParam === 'true') {
      console.log('Auth: Signup parameter detected, switching to signup mode');
      setMode('signup');
    }

    // Check for error parameters
    const error = query.get('error');
    const errorDescription = query.get('error_description');
    
    if (error && errorDescription) {
      console.log('Auth: Error parameters detected:', { error, errorDescription });
      const decodedError = decodeURIComponent(errorDescription);
      setAuthError(decodedError);
      
      // Check specifically for "Email not confirmed" error
      if (decodedError.includes('Email not confirmed')) {
        console.log('Auth: Email not confirmed error detected');
        toast.info('Please check your email', {
          description: 'You need to confirm your email address before logging in. Check your inbox for a confirmation link.',
          duration: 5000
        });
      } else {
        console.log('Auth: Generic authentication error:', decodedError);
        toast.error('Authentication failed', {
          description: decodedError,
        });
      }
    }

    // Check for hash fragment in URL (for OAuth callbacks)
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token=') || hash.includes('type=signup'))) {
      console.log('Auth: OAuth callback detected in URL, redirecting to callback handler');
      // Redirect to the callback handler
      window.location.href = '/auth/callback' + hash;
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('Auth: User authenticated, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Auth: Starting authentication process', { mode, email });
    setIsLoading(true);
    setAuthError(null);

    try {
      if (mode === 'signup') {
        console.log('Auth: Attempting signup');
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        
        console.log('Auth: Signup successful, confirmation email sent');
        toast.success('Check your email to confirm your account');
      } else {
        console.log('Auth: Attempting login');
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        console.log('Auth: Login successful, checking auth state');
        // Wait for auth state to be updated
        await checkAuth();
        
        console.log('Auth: Redirecting to dashboard');
        navigate('/dashboard');
        
        toast.success('Successfully logged in');
      }
    } catch (error) {
      console.error('Auth: Authentication error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(errorMessage);
      
      // Check specifically for "Email not confirmed" error
      if (errorMessage.includes('Email not confirmed')) {
        console.log('Auth: Email not confirmed error during login');
        toast.info('Please check your email', {
          description: 'You need to confirm your email address before logging in. Check your inbox for a confirmation link.',
          duration: 5000
        });
      } else {
        console.log('Auth: Generic authentication error:', errorMessage);
        toast.error(errorMessage);
      }
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
      // Log the reset attempt for debugging
      console.log(`Attempting password reset for: ${email}`);
      
      // Use the current origin for the redirect URL
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      console.log(`Using redirect URL: ${redirectUrl}`);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      if (error) throw error;
      
      toast.success('Password reset email sent', {
        description: 'Check your email for the password reset link',
      });
      
      // Return to login mode after successful request
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
      
      // Use current origin for localhost testing
      const currentOrigin = window.location.origin;
      // Check if we're in signup mode (new user)
      const redirectUrl = mode === 'signup' 
        ? `${currentOrigin}/dashboard?onboarding=complete&transfer=true`
        : `${currentOrigin}/dashboard`;
      
      console.log('Auth: Attempting Google sign-in', { mode, redirectUrl });  
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      
      if (error) throw error;
      
      // Wait for auth state to be updated
      await checkAuth();
      
      console.log('Auth: Redirecting to dashboard');
      navigate('/dashboard');
      
      // No need to navigate as the OAuth flow will redirect automatically
    } catch (error) {
      console.error('Google sign-in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      setAuthError(errorMessage);
      toast.error(errorMessage);
      setGoogleLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Checking authentication...</p>
        </div>
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
