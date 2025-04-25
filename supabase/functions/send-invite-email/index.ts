import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface InviteEmailPayload {
  email: string
  actionLink: string
  organisationName: string
  role: string
}

serve(async (req: Request) => {
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request payload
    const payload: InviteEmailPayload = await req.json()
    const { email, actionLink, organisationName, role } = payload

    // Send email using Supabase's built-in email service
    const { error } = await supabaseClient.auth.admin.sendRawEmail(email, {
      subject: `You've been invited to join ${organisationName}`,
      html: `
        <h2>You've been invited!</h2>
        <p>You've been invited to join ${organisationName} as a ${role}.</p>
        <p>Click the link below to accept the invitation:</p>
        <p><a href="${actionLink}">Accept Invitation</a></p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      `
    })

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ message: 'Invitation email sent successfully' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
}) 