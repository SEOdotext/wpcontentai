import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we have a token in the URL
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    // Log the URL parameters for debugging
    console.log('ResetPassword: URL parameters:', {
      token: token ? `present (length: ${token.length})` : 'missing',
      type: type || 'not specified',
      fullUrl: window.location.href,
      searchParams: Object.fromEntries(searchParams.entries())
    });
    
    // Check for token in hash as well (Supabase might use hash-based routing)
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const hashToken = hashParams.get('token');
    const hashType = hashParams.get('type');
    
    if (hashToken) {
      console.log('ResetPassword: Found token in hash:', {
        tokenLength: hashToken.length,
        type: hashType
      });
    }
    
    // Use either the search param token or hash token
    const finalToken = token || hashToken;
    const finalType = type || hashType;
    
    if (!finalToken) {
      console.error('No token found in URL or hash');
      setError('Invalid or expired reset link');
      toast.error('Invalid or expired reset link');
      navigate('/auth');
      return;
    }

    // If this is a recovery link from Supabase
    if (finalType === 'recovery') {
      console.log('ResetPassword: Processing Supabase recovery link', {
        tokenLength: finalToken.length,
        tokenFormat: finalToken.match(/^[0-9]+$/) ? 'numeric' : 'mixed',
        isExpectedLength: finalToken.length > 20,
        source: token ? 'searchParams' : 'hash'
      });
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const searchParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      
      // Get token from either search params or hash
      const token = searchParams.get('token') || hashParams.get('token');
      const type = searchParams.get('type') || hashParams.get('type');

      if (!token) {
        throw new Error('No token found in URL');
      }

      console.log('ResetPassword: Updating password with token type:', type || 'unknown', {
        tokenLength: token.length,
        source: searchParams.get('token') ? 'searchParams' : 'hash'
      });

      // First, set the session using the token
      const { error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      });

      if (sessionError) {
        console.error('ResetPassword: Error setting session:', sessionError);
        throw sessionError;
      }

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('ResetPassword: Error updating password:', updateError);
        throw updateError;
      }

      console.log('ResetPassword: Password updated successfully');
      toast.success('Password updated successfully');
      navigate('/auth', { 
        replace: true,
        state: { message: 'Password updated successfully. Please log in with your new password.' }
      });
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password');
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription className="text-center">
            Please enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded border border-red-200">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                className="h-10"
                required
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="h-10"
                required
                minLength={6}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full flex items-center justify-center gap-2 h-10" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword; 