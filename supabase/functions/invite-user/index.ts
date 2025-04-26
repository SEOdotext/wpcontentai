import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const { email, organisation_id, role } = await req.json();

    if (!email || !organisation_id || !role) {
      throw new Error('Missing required fields: email, organisation_id, role');
    }

    console.log('Sending invitation to:', { email, organisation_id, role });

    // Send invitation using admin client
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        organisation_id,
        role
      },
      redirectTo: `${new URL(req.url).origin}/auth/callback?next=/dashboard`
    });

    if (error) throw error;

    console.log('Invitation sent, creating membership');

    // Create organization membership
    const { error: membershipError } = await supabaseAdmin
      .from('organisation_memberships')
      .insert({
        organisation_id,
        role,
        member_id: data.user.id
      });

    if (membershipError) throw membershipError;

    console.log('Membership created');

    return new Response(
      JSON.stringify({ data, status: 'success' }),
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