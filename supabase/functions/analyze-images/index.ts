// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface AnalyzeRequest {
  image_ids: string[]
  website_id: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the request body
    const { image_ids, website_id } = await req.json() as AnalyzeRequest
    console.log('Received request:', { image_ids, website_id })

    if (!image_ids?.length || !website_id) {
      throw new Error('Missing required fields: image_ids and website_id')
    }

    // Get the images from the database
    const { data: images, error: fetchError } = await supabaseClient
      .from('images')
      .select('id, url, name')
      .in('id', image_ids)
      .eq('website_id', website_id)

    if (fetchError) {
      console.error('Error fetching images:', fetchError)
      throw new Error(`Error fetching images: ${fetchError.message}`)
    }

    console.log('Database query:', {
      ids: image_ids,
      website_id,
      found: images?.length || 0,
      images: images?.map(img => ({ id: img.id, name: img.name }))
    })

    if (!images?.length) {
      throw new Error('No images found with the provided IDs')
    }

    // Process each image
    const results = await Promise.all(images.map(async (image) => {
      try {
        console.log('Processing image:', image.id, 'URL:', image.url)
        
        // Call OpenAI API to analyze the image
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Please analyze this image and provide a detailed description that would be useful for SEO and accessibility. Focus on the main subject, colors, composition, and any notable details. Keep it concise but informative.' },
                  { 
                    type: 'image_url',
                    image_url: {
                      url: image.url
                    }
                  }
                ]
              }
            ],
            max_tokens: 300,
            temperature: 0.7,
            n: 1
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          console.error('OpenAI API error details:', {
            status: response.status,
            statusText: response.statusText,
            data: errorData,
            headers: Object.fromEntries(response.headers.entries())
          })
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log('OpenAI response for image:', image.id, data.choices?.[0]?.message?.content?.substring(0, 100) + '...')
        
        const description = data.choices[0].message.content

        // Update the image description in the database
        const { error: updateError } = await supabaseClient
          .from('images')
          .update({ description })
          .eq('id', image.id)
          .eq('website_id', website_id)

        if (updateError) {
          console.error('Error updating image description:', updateError)
          throw new Error(`Error updating image description: ${updateError.message}`)
        }

        return {
          id: image.id,
          success: true,
          description
        }
      } catch (error) {
        console.error(`Error processing image ${image.id}:`, error)
        return {
          id: image.id,
          success: false,
          error: error.message
        }
      }
    }))

    console.log('Analysis results:', results)

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error in analyze-images function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      }
    )
  }
}) 