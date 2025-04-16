import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // TESTING ONLY: Skip authentication for direct testing
    // In production, this would require proper authentication
    const { organisationId, creditsToAdd } = await req.json()
    
    if (!organisationId) throw new Error('Missing organisation ID')
    if (!creditsToAdd || typeof creditsToAdd !== 'number' || creditsToAdd <= 0) {
      throw new Error('Invalid credits amount, must be a positive number')
    }

    console.log(`⭐ TESTING - Adding ${creditsToAdd} credits to organisation ${organisationId}`)

    // Get current organization credits
    const { data: organisation, error: fetchError } = await supabaseClient
      .from('organisations')
      .select('credits, name')
      .eq('id', organisationId)
      .single()

    if (fetchError) {
      console.error(`Error fetching organisation: ${fetchError.message}`)
      throw new Error(`Error fetching organisation: ${fetchError.message}`)
    }

    if (!organisation) {
      console.error(`Organisation not found: ${organisationId}`)
      throw new Error(`Organisation not found: ${organisationId}`)
    }

    console.log(`⭐ TESTING - Found organisation: ${organisation.name}`)
    console.log(`⭐ TESTING - Current credits: ${organisation.credits || 0}`)
    
    // Calculate new credits total
    const currentCredits = organisation.credits || 0
    const newCredits = currentCredits + creditsToAdd

    console.log(`⭐ TESTING - Will update credits: ${currentCredits} + ${creditsToAdd} = ${newCredits}`)
    
    // Update the organization with new credits
    const updateResult = await supabaseClient
      .from('organisations')
      .update({ credits: newCredits })
      .eq('id', organisationId)

    console.log(`⭐ TESTING - Update result:`, updateResult)
    
    if (updateResult.error) {
      console.error(`Error updating organisation credits: ${updateResult.error.message}`)
      throw new Error(`Error updating organisation credits: ${updateResult.error.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Added ${creditsToAdd} credits to organisation ${organisationId}`,
        previousCredits: currentCredits,
        newCredits: newCredits,
        organisation: {
          id: organisationId,
          name: organisation.name
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(`Error in add-credits:`, error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 