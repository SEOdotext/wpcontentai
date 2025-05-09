// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ScrapeRequest {
  website_url: string
  user_id: string
}

async function scrapeImages(url: string): Promise<string[]> {
  console.log('Fetching webpage:', url)
  
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Referer': new URL(url).origin,
  }
  
  try {
    // Try direct fetch first
    let response = await fetch(url, { headers: browserHeaders })
    
    // If direct fetch fails, try with a delay
    if (!response.ok) {
      console.log('Initial fetch failed, retrying with delay...')
      await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
      response = await fetch(url, { headers: browserHeaders })
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch webpage: ${response.status} ${response.statusText}. Please check if the website URL is correct and accessible.`)
    }
    
    const html = await response.text()
    console.log('Received HTML content length:', html.length)
    
    // Use multiple regex patterns to find image URLs
    const patterns = [
      /<img[^>]+src="([^">]+)"[^>]+(?:width|height)="([^">]+)"/g,  // Images with dimensions
      /<img[^>]+(?:width|height)="([^">]+)"[^>]+src="([^">]+)"/g,  // Images with dimensions (reversed order)
      /<img[^>]+src="([^">]+)"[^>]*>/g,  // All other images
      /<meta[^>]+property="og:image"[^>]+content="([^">]+)"/g,  // Open Graph images
      /<link[^>]+rel="image_src"[^>]+href="([^">]+)"/g,  // Image source links
      /background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/g,  // CSS background images
    ]
    
    const images = new Set<string>()
    const dimensionCache = new Map<string, { width?: number, height?: number }>()
    
    // Helper function to check if URL likely points to a logo/icon
    const isLikelyLogoOrIcon = (url: string): boolean => {
      const lowercaseUrl = url.toLowerCase()
      return (
        lowercaseUrl.includes('logo') ||
        lowercaseUrl.includes('icon') ||
        lowercaseUrl.includes('favicon') ||
        lowercaseUrl.includes('avatar') ||
        lowercaseUrl.includes('badge') ||
        lowercaseUrl.includes('thumb') ||
        lowercaseUrl.includes('-small') ||
        lowercaseUrl.includes('-mini') ||
        lowercaseUrl.match(/\d+x\d+/) !== null
      )
    }

    // Helper function to extract dimensions from HTML attributes
    const extractDimensions = (attr: string): number | undefined => {
      const num = parseInt(attr, 10)
      return !isNaN(num) ? num : undefined
    }

    // Process each pattern
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        try {
          let imgUrl: string
          let width: number | undefined = undefined
          let height: number | undefined = undefined

          // Extract URL and dimensions based on pattern
          if (pattern.toString().includes('width|height')) {
            imgUrl = match[1]
            const dimension = extractDimensions(match[2])
            if (dimension) {
              if (match[0].includes('width')) {
                width = dimension
              } else {
                height = dimension
              }
            }
          } else {
            imgUrl = match[1]
          }

          // Handle relative URLs
          try {
            const absoluteUrl = new URL(imgUrl, url).toString()
            
            // Skip if it's likely a logo/icon
            if (isLikelyLogoOrIcon(absoluteUrl)) {
              console.log('Skipping likely logo/icon:', absoluteUrl)
              continue
            }

            // Skip non-http(s) URLs
            if (!absoluteUrl.startsWith('http')) {
              continue
            }

            // Store dimensions in cache
            if (width || height) {
              dimensionCache.set(absoluteUrl, { width, height })
            }

            images.add(absoluteUrl)
          } catch (e) {
            console.warn('Invalid URL:', imgUrl)
          }
        } catch (e) {
          console.warn('Failed to process image URL:', match[1])
        }
      }
    }

    // Filter and validate images with delay between requests
    const validImages = Array.from(images)
    const imagePromises = validImages.map(async (imgUrl, index) => {
      try {
        // Add delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, index * 100))
        
        // Check if we already have dimensions
        const cachedDimensions = dimensionCache.get(imgUrl)
        if (cachedDimensions) {
          const { width, height } = cachedDimensions
          if ((width && width < 300) || (height && height < 200)) {
            console.log('Skipping small image:', imgUrl, { width, height })
            return null
          }
        }

        // Fetch image headers with browser-like headers
        const response = await fetch(imgUrl, {
          method: 'HEAD',
          headers: {
            ...browserHeaders,
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          }
        })

        if (!response.ok) {
          console.log('Failed to fetch image:', imgUrl, response.status)
          return null
        }

        const contentType = response.headers.get('content-type')
        const contentLength = response.headers.get('content-length')

        // Skip if not an image
        if (!contentType?.startsWith('image/')) {
          console.log('Not an image:', imgUrl, contentType)
          return null
        }

        // Skip if file size is too small or too large
        const size = parseInt(contentLength || '0', 10)
        if (size < 10000 || size > 10 * 1024 * 1024) {
          console.log('Skipping image due to size:', imgUrl, { size })
          return null
        }

        return imgUrl
      } catch (error) {
        console.warn('Failed to validate image:', imgUrl, error)
        return null
      }
    })

    const validatedImages = (await Promise.all(imagePromises)).filter(Boolean) as string[]
    console.log('Found valid images:', validatedImages.length)
    
    if (validatedImages.length === 0) {
      throw new Error('No valid images found on the webpage. Please check if the website contains accessible images.')
    }
    
    return validatedImages
  } catch (error: unknown) {
    console.error('Error scraping images:', error)
    throw error instanceof Error ? error : new Error('Failed to scrape images')
  }
}

async function importImageToContentGardener(imageUrl: string, userId: string) {
  try {
    console.log('Processing image:', imageUrl)
    
    // Download image with browser-like headers
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': new URL(imageUrl).origin,
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType?.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`)
    }
    
    const imageBuffer = await response.arrayBuffer()
    console.log('Downloaded image size:', imageBuffer.byteLength)
    
    // Generate a unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = contentType.split('/')[1] || 'jpg'
    const fileName = `website-images/${userId}/${timestamp}_${randomString}.${fileExtension}`
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, imageBuffer, {
        contentType,
        upsert: true
      })
    
    if (uploadError) throw uploadError
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName)
    
    // Create image record in database
    const { data: imageData, error: dbError } = await supabase
      .from('images')
      .insert({
        website_id: userId,
        name: fileName.split('/').pop() || 'scraped-image',
        url: publicUrl,
        size: imageBuffer.byteLength,
        type: contentType,
        source: 'scraped',
        metadata: {
          source_url: imageUrl,
          originalName: new URL(imageUrl).pathname.split('/').pop() || '',
          originalUrl: imageUrl,
          imported_at: new Date().toISOString()
        }
      })
      .select()
    
    if (dbError) throw dbError
    
    console.log('Successfully imported image:', fileName)
    return imageData
  } catch (error: unknown) {
    console.error('Error importing image:', error)
    return null
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const { website_url, user_id } = await req.json() as ScrapeRequest
    
    if (!website_url || !user_id) {
      throw new Error('Missing required parameters')
    }

    // First, get all existing images for this website
    const { data: existingImages, error: existingError } = await supabase
      .from('images')
      .select('metadata')
      .eq('website_id', user_id)
    
    if (existingError) {
      console.error('Error fetching existing images:', existingError)
    }

    // Create a Set of existing source URLs for quick lookup
    const existingSourceUrls = new Set(
      existingImages?.map(img => img.metadata?.source_url).filter(Boolean) || []
    )
    console.log('Found existing images:', existingSourceUrls.size)

    // Scrape images from website
    const images = await scrapeImages(website_url)
    console.log('Total images found:', images.length)
    
    // Filter out already imported images
    const newImages = images.filter(url => !existingSourceUrls.has(url))
    console.log('New images to import:', newImages.length)
    
    if (newImages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          imported_count: 0,
          images: [],
          message: 'All images have already been imported'
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    // Process up to 10 new images
    const processedImages = await Promise.all(
      newImages.slice(0, 10).map(url => importImageToContentGardener(url, user_id))
    )
    
    // Filter out failed imports
    const successfulImports = processedImages.filter(img => img !== null)
    console.log('Successfully imported images:', successfulImports.length)
    
    return new Response(
      JSON.stringify({
        success: true,
        imported_count: successfulImports.length,
        images: successfulImports
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error: unknown) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}) 