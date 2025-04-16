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
  includeCredits?: boolean;
  creditPackageId?: string;
  creditPackageQty?: number;
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

    const { type, plan, includeCredits, creditPackageId, creditPackageQty } = await req.json()

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
        hobby: 'price_1RBEJwRGhl9iFwDNmsBsnVX5',  // Seed €15/month
        pro: 'price_1RBEPdRGhl9iFwDNsMnaYvh5',    // Professional €49/month
        agency: 'price_1RBMVnRGhl9iFwDNYi4upwcm'   // Agency/Enterprise €149/month
      }

      const priceId = priceIds[plan || 'agency']
      if (!priceId) throw new Error(`Invalid plan: ${plan}`)

      // Create line items array with subscription
      const lineItems = [{
        price: priceId,
        quantity: 1
      }]

      // Add credit package if requested
      if (includeCredits && creditPackageId) {
        // Validate credit package ID matches our known IDs
        const validCreditPackageIds = [
          'price_1RBVpYRGhl9iFwDNYmIXpeix',  // 10 Article Package €20
          'price_1RBVd3RGhl9iFwDNCuJUImV7'   // 50 Article Package €100
        ]
        if (!validCreditPackageIds.includes(creditPackageId)) {
          throw new Error('Invalid credit package ID')
        }
        
        // Add credit package with adjustable quantity in checkout
        // Stripe requires a minimum quantity of 1, but we'll make it adjustable in the checkout
        const creditLineItem = {
          price: creditPackageId,
          quantity: 1,
          adjustable_quantity: {
            enabled: true,
            minimum: 0,
            maximum: 10
          }
        };
        
        // Add to line items
        lineItems.push(creditLineItem);
      }

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: lineItems,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        success_url: 'https://contentgardener.ai/organisation?success=true',
        cancel_url: 'https://contentgardener.ai/organisation?canceled=true',
        metadata: {
          organisation_id: org.id,
          plan: plan || 'agency',
          includes_credits: includeCredits ? 'true' : 'false'
        },
        subscription_data: {
          metadata: {
            organisation_id: org.id,
            plan: plan || 'agency',
            includes_credits: includeCredits ? 'true' : 'false'
          }
        }
      })

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (type === 'payment') {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: 'https://contentgardener.ai/organisation'
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