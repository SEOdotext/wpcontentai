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

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsAuthenticated(true);
        navigate('/');
      } else {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          navigate('/');
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
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
        navigate('/');
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
      // Log the reset attempt for debugging
      console.log(`Attempting password reset for: ${email}`);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: import.meta.env.DEV 
          ? 'http://localhost:8081/auth/reset-password' 
          : `${window.location.origin}/auth/reset-password`,
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
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: import.meta.env.DEV ? 'http://localhost:8081/' : `${window.location.origin}/`
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

  if (isAuthenticated === null) {
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
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
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
              
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full flex items-center gap-2" 
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full flex items-center gap-2"
                  onClick={() => setMode('login')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === 'login' ? 'Login' : 'Sign Up'}</CardTitle>
          <CardDescription>
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
              className="w-full flex items-center gap-2" 
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FcGoogle className="h-5 w-5" />
              )}
              {mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
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
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
                className="w-full flex items-center gap-2" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {isLoading ? 'Please wait...' : mode === 'login' ? 'Login with Email' : 'Sign Up with Email'}
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
