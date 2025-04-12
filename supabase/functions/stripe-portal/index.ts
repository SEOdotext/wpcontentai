import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const stripe = Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

interface RequestBody {
  type: 'payment' | 'subscription';
  plan?: 'hobby' | 'pro' | 'agency';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) throw new Error('Invalid user token')

    const { type, plan } = await req.json()

    const { data: membership } = await supabaseClient
      .from('organisation_memberships')
      .select('organisation_id, role')
      .eq('member_id', user.id)
      .single()

    if (!membership) throw new Error('Organization membership not found')

    const { data: org } = await supabaseClient
      .from('organisations')
      .select('stripe_id, name, id')
      .eq('id', membership.organisation_id)
      .single()

    if (!org) throw new Error('Organization not found')

    let stripeCustomerId = org.stripe_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: user.email,
        metadata: { organisation_id: org.id }
      })
      stripeCustomerId = customer.id

      await supabaseClient
        .from('organisations')
        .update({ stripe_id: stripeCustomerId })
        .eq('id', org.id)
    }

    if (type === 'subscription') {
      const priceIds = {
        hobby: 'price_1RBEJwRGhl9iFwDNmsBsnVX5',
        pro: 'price_1RBEPdRGhl9iFwDNsMnaYvh5',
        agency: 'price_1RBMVnRGhl9iFwDNYi4upwcm'
      }

      const priceId = priceIds[plan || 'agency']
      if (!priceId) throw new Error(`Invalid plan: ${plan}`)

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        success_url: 'https://contentgardener.ai/organization?success=true',
        cancel_url: 'https://contentgardener.ai/organization?canceled=true'
      })

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (type === 'payment') {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: 'https://contentgardener.ai/organization'
      })

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid session type')
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 