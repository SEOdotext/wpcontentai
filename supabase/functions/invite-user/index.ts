import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  try {
    const { email, organisation_id, role } = await req.json();

    // Send invitation using admin client
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        organisation_id,
        role
      },
      redirectTo: `${new URL(req.url).origin}/auth/callback?next=/dashboard`
    });

    if (error) throw error;

    // Create organization membership
    const { error: membershipError } = await supabaseAdmin
      .from('organisation_memberships')
      .insert({
        organisation_id,
        role,
        member_id: data.user.id
      });

    if (membershipError) throw membershipError;

    return new Response(JSON.stringify({ data, status: 'success' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}); 