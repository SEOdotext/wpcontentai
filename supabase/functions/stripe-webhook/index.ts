import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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

// Credit packages configuration
const CREDIT_PACKAGES = {
  'price_1RBVpYRGhl9iFwDNYmIXpeix': { credits: 10 },  // 10 Article Package €20
  'price_1RBVd3RGhl9iFwDNCuJUImV7': { credits: 50 }   // 50 Article Package €100
};

// Plan credits configuration (monthly allocation)
const PLAN_CREDITS = {
  'price_1RBEJwRGhl9iFwDNmsBsnVX5': 5,     // Hobby - 5 credits per month
  'price_1RBEPdRGhl9iFwDNsMnaYvh5': 15,    // Pro - 15 credits per month
  'price_1RBMVnRGhl9iFwDNYi4upwcm': 50     // Agency - 50 credits per month
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log headers for debugging
    console.log('⭐ DEBUGGING WEBHOOK - REQUEST RECEIVED ⭐')
    console.log('Request headers:', Object.fromEntries([...req.headers.entries()]))
    
    // Get the stripe signature from the request headers
    const signature = req.headers.get('stripe-signature')
    
    // Get the request body as text
    const body = await req.text()
    console.log('Request body length:', body.length)
    
    // If we have a signature and webhook secret, verify the event
    let event;
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (signature && webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        console.log('Webhook signature verified successfully')
      } catch (err) {
        console.error(`⚠️ Webhook signature verification failed: ${err.message}`)
        return new Response(
          JSON.stringify({ error: `Webhook signature verification failed` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // For testing, parse the body as JSON
      try {
        event = JSON.parse(body);
        console.log('Parsed webhook data without signature verification')
      } catch (err) {
        console.error(`Failed to parse webhook body: ${err.message}`)
        return new Response(
          JSON.stringify({ error: 'Invalid webhook payload' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    console.log('⭐ EVENT TYPE:', event.type)
    
    // Process the event based on its type
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`)
    // Still return 200 to Stripe - they recommend this for non-verification errors
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Handle checkout.session.completed event
 * This is triggered when a customer completes the checkout
 */
async function handleCheckoutSessionCompleted(session) {
  console.log('Processing checkout.session.completed event')
  console.log('Session ID:', session.id)
  console.log('Session metadata:', JSON.stringify(session.metadata))
  
  // Get the organization ID from the session metadata
  const organisationId = session.metadata?.organisation_id
  if (!organisationId) {
    console.error('No organisation ID found in session metadata')
    return
  }
  
  console.log('Found organisation ID:', organisationId)

  // Get line items from the session
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 })
    console.log('Line items retrieved:', lineItems.data.length)
    
    // Calculate additional credits from credit packages
    let additionalCredits = 0
    for (const item of lineItems.data) {
      console.log('Processing line item:', item.price.id, 'Quantity:', item.quantity)
      // Check if this is a credit package
      if (CREDIT_PACKAGES[item.price.id]) {
        const packageCredits = CREDIT_PACKAGES[item.price.id].credits
        additionalCredits += packageCredits * item.quantity
        console.log('Credit package found! Adding credits:', packageCredits * item.quantity)
      } else {
        console.log('Not a credit package or quantity is 0')
      }
    }

    // Check if we need to update the plan and add credits
    const plan = session.metadata?.plan
    if (plan) {
      console.log('Found plan in metadata:', plan)
      
      // Map plan name to price ID for credits lookup
      let planPriceId: string | null = null
      let planName: string = 'No active plan'
      
      switch(plan) {
        case 'hobby':
          planPriceId = 'price_1RBEJwRGhl9iFwDNmsBsnVX5'
          planName = 'Hobby'
          break
        case 'pro':
          planPriceId = 'price_1RBEPdRGhl9iFwDNsMnaYvh5'
          planName = 'Professional'
          break
        case 'agency':
          planPriceId = 'price_1RBMVnRGhl9iFwDNYi4upwcm'
          planName = 'Agency/Enterprise'
          break
      }
      
      if (planPriceId && PLAN_CREDITS[planPriceId]) {
        const planCredits = PLAN_CREDITS[planPriceId]
        console.log('Adding plan credits for new subscription:', planCredits)
        // Add plan credits and update the current plan name
        await updateOrganizationPlan(organisationId, planCredits, planName)
      } else {
        console.log('No matching plan credit key found')
      }
    } else if (additionalCredits > 0) {
      // Only add credits from packages without updating plan
      console.log('Updating organisation with additional credits:', additionalCredits)
      await updateOrganizationCredits(organisationId, additionalCredits)
    } else {
      console.log('No plan found in metadata and no additional credits to add')
    }
  } catch (error) {
    console.error('Error processing line items:', error.message)
  }
}

/**
 * Handle invoice.paid event
 * This is triggered for recurring payments (monthly subscriptions)
 */
async function handleInvoicePaid(invoice) {
  console.log('Processing invoice.paid event')
  
  // Get the customer ID
  const customerId = invoice.customer
  if (!customerId) {
    console.error('No customer ID found in invoice')
    return
  }
  
  // Find the organization with this Stripe customer ID
  const { data: organisation, error } = await supabaseClient
    .from('organisations')
    .select('id')
    .eq('stripe_id', customerId)
    .single()
  
  if (error || !organisation) {
    console.error(`Error finding organisation: ${error?.message || 'Not found'}`)
    return
  }
  
  // Get line items from the invoice
  const lines = invoice.lines.data
  
  // Process subscription plan credits and update plan info
  let planUpdated = false
  for (const line of lines) {
    const priceId = line.price.id
    if (PLAN_CREDITS[priceId]) {
      const planCredits = PLAN_CREDITS[priceId]
      let planName = 'Starter'
      
      // Determine plan name based on price ID
      if (priceId === 'price_1RBEJwRGhl9iFwDNmsBsnVX5') {
        planName = 'Hobby'
      } else if (priceId === 'price_1RBEPdRGhl9iFwDNsMnaYvh5') {
        planName = 'Professional'
      } else if (priceId === 'price_1RBMVnRGhl9iFwDNYi4upwcm') {
        planName = 'Agency/Enterprise'
      }
      
      // Update organization plan, credits, and next payment date
      await updateOrganizationPlan(organisation.id, planCredits, planName)
      console.log(`Updated plan to ${planName} and added ${planCredits} monthly credits for plan ${priceId}`)
      planUpdated = true
      break // Only need to process one subscription plan
    }
  }
  
  // Process any credit packages as one-time purchases
  if (!planUpdated) {
    let totalAdditionalCredits = 0
    for (const line of lines) {
      const priceId = line.price.id
      if (CREDIT_PACKAGES[priceId]) {
        const packageCredits = CREDIT_PACKAGES[priceId].credits
        const additionalCredits = packageCredits * line.quantity
        totalAdditionalCredits += additionalCredits
        console.log(`Adding ${additionalCredits} credits from package ${priceId}`)
      }
    }
    
    if (totalAdditionalCredits > 0) {
      // Update organization with additional credits from packages
      await updateOrganizationCredits(organisation.id, totalAdditionalCredits)
      console.log(`Added ${totalAdditionalCredits} total credits from packages`)
    }
  }
}

/**
 * Update an organization's credits in the database
 */
async function updateOrganizationCredits(organisationId, additionalCredits) {
  console.log(`⭐ UPDATING CREDITS - Starting update for org ${organisationId} with ${additionalCredits} credits`)
  
  // First get current credits
  try {
    console.log(`⭐ UPDATING CREDITS - Fetching current credits from database`)
    const { data: organisation, error: fetchError } = await supabaseClient
      .from('organisations')
      .select('credits, name')
      .eq('id', organisationId)
      .single()
    
    if (fetchError) {
      console.error(`Error fetching organisation: ${fetchError.message}`, fetchError)
      console.error(`⭐ FETCH ERROR DETAILS:`, JSON.stringify(fetchError))
      return
    }
    
    if (!organisation) {
      console.error(`⭐ UPDATING CREDITS - Organisation not found in database: ${organisationId}`)
      return
    }
    
    console.log(`⭐ UPDATING CREDITS - Found organisation: ${organisation.name}`)
    console.log(`⭐ UPDATING CREDITS - Current credits: ${organisation.credits || 0}`)
    
    // Calculate new credits total
    const currentCredits = organisation.credits || 0
    const newCredits = currentCredits + additionalCredits
    
    console.log(`⭐ UPDATING CREDITS - Will update credits: ${currentCredits} + ${additionalCredits} = ${newCredits}`)
    
    // Update the organization with new credits
    console.log(`⭐ UPDATING CREDITS - Running database update`)
    const updateResult = await supabaseClient
      .from('organisations')
      .update({ credits: newCredits })
      .eq('id', organisationId)
    
    console.log(`⭐ UPDATING CREDITS - Update completed`, updateResult)
    
    if (updateResult.error) {
      console.error(`⭐ UPDATING CREDITS - Error updating organisation credits:`, updateResult.error)
      console.error(`⭐ UPDATE ERROR DETAILS:`, JSON.stringify(updateResult.error))
      return
    }
    
    console.log(`⭐ UPDATING CREDITS - Successfully updated organisation ${organisationId} credits: ${currentCredits} → ${newCredits}`)
  } catch (error) {
    console.error(`⭐ UPDATING CREDITS - Unexpected error:`, error)
    console.error(`⭐ ERROR STACK:`, error.stack)
  }
}

/**
 * Update an organization's plan and credits in the database
 */
async function updateOrganizationPlan(organisationId, additionalCredits, planName) {
  console.log(`⭐ UPDATING PLAN - Starting update for org ${organisationId} with plan ${planName} and ${additionalCredits} credits`)
  
  // First get current credits
  try {
    console.log(`⭐ UPDATING PLAN - Fetching current organization data from database`)
    const { data: organisation, error: fetchError } = await supabaseClient
      .from('organisations')
      .select('credits, name, current_plan')
      .eq('id', organisationId)
      .single()
    
    if (fetchError) {
      console.error(`Error fetching organisation: ${fetchError.message}`, fetchError)
      console.error(`⭐ FETCH ERROR DETAILS:`, JSON.stringify(fetchError))
      return
    }
    
    if (!organisation) {
      console.error(`⭐ UPDATING PLAN - Organisation not found in database: ${organisationId}`)
      return
    }
    
    console.log(`⭐ UPDATING PLAN - Found organisation: ${organisation.name}`)
    console.log(`⭐ UPDATING PLAN - Current plan: ${organisation.current_plan || 'No active plan'}`)
    console.log(`⭐ UPDATING PLAN - Current credits: ${organisation.credits || 0}`)
    
    // Calculate new credits total
    const currentCredits = organisation.credits || 0
    const newCredits = currentCredits + additionalCredits
    
    // Calculate next payment date (1 month from now)
    const nextPaymentDate = new Date()
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)
    
    console.log(`⭐ UPDATING PLAN - Will update credits: ${currentCredits} + ${additionalCredits} = ${newCredits}`)
    console.log(`⭐ UPDATING PLAN - Will update plan to: ${planName}`)
    console.log(`⭐ UPDATING PLAN - Will set next payment date to: ${nextPaymentDate.toISOString()}`)
    
    // Update the organization with new plan and credits
    console.log(`⭐ UPDATING PLAN - Running database update`)
    const updateResult = await supabaseClient
      .from('organisations')
      .update({ 
        credits: newCredits,
        current_plan: planName,
        next_payment_date: nextPaymentDate.toISOString()
      })
      .eq('id', organisationId)
    
    console.log(`⭐ UPDATING PLAN - Update completed`, updateResult)
    
    if (updateResult.error) {
      console.error(`⭐ UPDATING PLAN - Error updating organisation:`, updateResult.error)
    }
  } catch (error) {
    console.error(`⭐ UPDATING PLAN - Error in update:`, error)
  }
} 