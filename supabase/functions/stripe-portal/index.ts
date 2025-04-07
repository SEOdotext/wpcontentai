import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.4.0?target=deno'

// Initialize Stripe with debug logging
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set')
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16'
})

interface RequestBody {
  type: 'payment' | 'subscription';
  plan?: 'hobby' | 'pro' | 'agency';
}

serve(async (req) => {
  console.log('=== STRIPE PORTAL SESSION REQUEST ===')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    console.log('Auth header present:', !!authHeader)

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      console.error('User auth error:', userError)
      throw new Error('Invalid user token')
    }

    console.log('Authenticated user ID:', user.id)

    // Get user's organization through membership
    const { data: membership, error: membershipError } = await supabaseClient
      .from('organisation_memberships')
      .select('organisation_id')
      .eq('member_id', user.id)
      .single()

    if (membershipError || !membership) {
      console.error('Membership error:', membershipError)
      throw new Error('No organization membership found')
    }

    console.log('Found organization membership:', membership.organisation_id)

    // Get organisation details
    const { data: org, error: orgError } = await supabaseClient
      .from('organisations')
      .select('stripe_id, name, id')
      .eq('id', membership.organisation_id)
      .single()

    if (orgError) {
      console.error('Organization error:', orgError)
      throw new Error('Organization not found')
    }

    console.log('Organization details:', {
      name: org.name,
      stripe_id: org.stripe_id,
      has_stripe_id: !!org.stripe_id
    })

    let stripeCustomerId = org.stripe_id

    // If no Stripe customer exists, create one
    if (!stripeCustomerId) {
      console.log('Creating new Stripe customer for organization:', org.name)
      
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: {
          organisation_id: org.id
        }
      })

      stripeCustomerId = customer.id

      // Update organization with new Stripe customer ID
      const { error: updateError } = await supabaseClient
        .from('organisations')
        .update({ stripe_id: stripeCustomerId })
        .eq('id', org.id)

      if (updateError) {
        console.error('Error updating organization with Stripe ID:', updateError)
        throw new Error('Failed to update organization with Stripe ID')
      }

      console.log('Created and saved new Stripe customer:', stripeCustomerId)
    }

    // Create Stripe billing portal session
    console.log('Creating session for customer:', stripeCustomerId)
    
    const body: RequestBody = await req.json();
    const { type, plan } = body;
    console.log('Session type:', type, 'Plan:', plan);

    if (type === 'subscription') {
      // Create Checkout session for subscription management
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan === 'hobby' ? 'price_1RBEJwRGhl9iFwDNmsBsnVX5' : // Hobby plan - €15/month
                  plan === 'pro' ? 'price_1RBEPdRGhl9iFwDNsMnaYvh5' : // Pro plan - €49/month
                  'price_1RBMVnRGhl9iFwDNYi4upwcm', // Agency/Enterprise plan - €149/month
            quantity: 1,
            adjustable_quantity: {
              enabled: false
            }
          }
        ],
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        subscription_data: {
          metadata: {
            plan_type: plan || 'agency',
            websites_included: plan === 'hobby' ? '1' :
                             plan === 'pro' ? '1' :
                             'unlimited',
            articles_per_month: plan === 'hobby' ? '5' :
                              plan === 'pro' ? '20' :
                              '100'
          }
        },
        success_url: 'https://contentgardener.ai/organization?success=true',
        cancel_url: 'https://contentgardener.ai/organization?canceled=true'
      });

      console.log('Checkout session created:', {
        session_id: session.id,
        url: session.url,
        type: type,
        plan: plan || 'agency'
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
          } 
        }
      );
    } else if (type === 'payment') {
      // Create portal session only for payment method management
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: 'https://contentgardener.ai/organization',
        locale: 'da',
        flow_data: {
          type: 'payment_method_update'
        }
      });

      console.log('Portal session created:', {
        session_id: portalSession.id,
        url: portalSession.url,
        type: type
      });

      return new Response(
        JSON.stringify({ url: portalSession.url }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
          } 
        }
      );
    }

    // Return error for invalid type
    return new Response(
      JSON.stringify({ error: 'Invalid session type. Must be "subscription" or "payment".' }),
      { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        } 
      }
    );
  } catch (error: unknown) {
    console.error('Error in stripe-portal function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}); 