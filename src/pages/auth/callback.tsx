import { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Starting magic link callback handling');
        
        // Get the current session after magic link verification
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw sessionError;
        }
        
        if (!session) {
          console.error('No session found after magic link verification');
          toast.error('Authentication failed. Please try again.');
          navigate('/auth', { replace: true });
          return;
        }

        console.log('Magic link verification successful, session established');

        // Get user metadata
        const metadata = session.user.user_metadata;
        console.log('Processing user metadata:', {
          email: session.user.email,
          role: metadata?.role,
          organisationId: metadata?.organisation_id,
          isNewInvite: metadata?.isNewInvite,
          invitedBy: metadata?.invitedByEmail
        });

        // Handle organization invites
        if (metadata?.organisation_id) {
          console.log(`Processing ${metadata.role} invitation to ${metadata.organisationName}`);
          
          const { error: invitationError } = await supabase.rpc('handle_organisation_invitation', {
            p_email: session.user.email,
            p_organisation_id: metadata.organisation_id,
            p_role: metadata.role || 'member',
            p_website_ids: metadata.website_ids || []
          });

          if (invitationError) {
            console.error('Error processing organization invite:', invitationError);
            toast.error('Failed to process invitation. Please contact support.');
          } else {
            const roleMessage = metadata.role === 'admin' 
              ? 'You have been added as an administrator.' 
              : 'You have been added as a team member.';
            
            console.log('Organization invite processed successfully');
            toast.success(`Welcome to ${metadata.organisationName}! ${roleMessage}`);
          }

          // Update auth context
          await checkAuth();

          // For new invites, redirect to profile setup
          if (metadata.isNewInvite) {
            navigate('/profile', { 
              replace: true,
              state: { 
                newUser: true,
                role: metadata.role,
                message: 'Please set up your password and account preferences.' 
              }
            });
            return;
          }
        }

        // For all other cases, update auth and go to dashboard
        await checkAuth();
        navigate('/dashboard', { replace: true });

      } catch (error) {
        console.error('Error in magic link callback:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, location, checkAuth]);

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