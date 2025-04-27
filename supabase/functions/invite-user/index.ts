import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const body = await req.text();
    console.log('Request body:', body);

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      throw new Error('Invalid JSON in request body');
    }

    const { email, organisation_id, role, is_resend } = data;

    if (!email || !organisation_id || !role) {
      console.error('Missing required fields:', { email, organisation_id, role });
      throw new Error('Missing required fields: email, organisation_id, role');
    }

    console.log('Processing invitation:', { email, organisation_id, role, is_resend });

    if (is_resend) {
      // For resends, first check if user exists
      const { data: existingUser, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
      
      if (userError && userError.message !== 'User not found') {
        // Only throw if it's an error other than user not found
        console.error('Error checking existing user:', userError);
        throw userError;
      }

      if (existingUser) {
        // User exists - generate a magic link
        console.log('User exists, generating magic link');
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `https://contentgardener.ai/auth/callback?type=invite&next=/dashboard`
          }
        });

        if (linkError) {
          console.error('Error generating magic link:', linkError);
          throw linkError;
        }

        console.log('Magic link generated successfully');

        return new Response(
          JSON.stringify({ 
            data: linkData, 
            status: 'success',
            message: 'Magic link sent successfully'
          }),
          { 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            status: 200 
          }
        );
      } else {
        // User doesn't exist - send a new invitation
        console.log('User not found, sending new invitation');
      }
    }

    // For new invites or resends to non-existent users, use the invitation flow
    const { data: inviteData, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        organisation_id,
        role
      },
      redirectTo: `https://contentgardener.ai/auth/callback?type=invite&next=/dashboard`
    });

    if (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }

    console.log('Invitation sent successfully:', inviteData);

    return new Response(
      JSON.stringify({ 
        data: inviteData, 
        status: 'success',
        message: is_resend ? 'New invitation sent successfully' : 'Invitation sent successfully'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in invite-user function:', error);

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        status: 'error'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400 
      }
    );
  }
}); 