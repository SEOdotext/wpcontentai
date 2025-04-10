import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface OnboardingData {
  userId: string
  websiteInfo: {
    name: string
    url: string
    language?: string
  }
  organizationInfo: {
    name: string
  }
  publicationSettings: {
    posting_frequency: number
    posting_days: Array<{ day: string; count: number }>
    writing_style: string
    subject_matters: any[]
    wordpress_template?: string
    image_prompt?: string
    negative_prompt?: string
  }
  contentData: {
    postIdeas: Array<{
      title: string
      subject_matter: string
      post_content: string | null
      tags: string[]
      liked: boolean
      status: string
    }>
    generatedContent?: {
      title: string
      post_content: string | null
      status: string
      subject_matter: string
      tags: string[]
    }
    websiteContent: Array<{
      title: string
      url: string
      content: string
      content_type: string
      metadata?: {
        digest?: string | null
        is_cornerstone?: boolean
      }
      last_fetched?: string
    }>
    keyContentPages?: Array<{
      id: string
      url: string
      title: string
      reason?: string
    }>
  }
}

// Validation function
function validateOnboardingData(data: any): { isValid: boolean; error?: string } {
  console.log('Validating onboarding data:', JSON.stringify(data, null, 2))

  if (!data.userId) {
    return { isValid: false, error: 'Missing userId' }
  }

  // Validate websiteInfo
  if (!data.websiteInfo?.name || !data.websiteInfo?.url) {
    return { isValid: false, error: 'Invalid websiteInfo structure' }
  }

  // Validate organizationInfo
  if (!data.organizationInfo?.name) {
    return { isValid: false, error: 'Invalid organizationInfo structure' }
  }

  // Validate publicationSettings
  if (!data.publicationSettings) {
    return { isValid: false, error: 'Missing publicationSettings' }
  }

  if (typeof data.publicationSettings.posting_frequency !== 'number') {
    return { isValid: false, error: 'Invalid posting_frequency' }
  }

  if (!Array.isArray(data.publicationSettings.posting_days)) {
    return { isValid: false, error: 'Invalid posting_days structure' }
  }

  return { isValid: true }
}

// Add this helper function before the serve function
function getNextPostingDates(postingDays: Array<{ day: string; count: number }>, count: number): string[] {
  const dayMap: Record<string, number> = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6
  };

  // Create a repeating array of days based on count
  const allDays = postingDays.flatMap(({ day, count: dayCount }) => 
    Array(dayCount).fill(day.toLowerCase())
  );

  const dates: string[] = [];
  const today = new Date();
  let currentDate = new Date(today);

  // Start from tomorrow
  currentDate.setDate(currentDate.getDate() + 1);

  while (dates.length < count) {
    const dayOfWeek = currentDate.getDay();
    const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
    
    if (allDays.includes(dayName)) {
      dates.push(new Date(currentDate).toISOString());
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Get auth token from request
    const apikey = req.headers.get('apikey')
    if (!apikey) {
      console.error('No API key provided in headers')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing authorization header',
          code: 401
        }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      )
    }

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key for admin access
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the request body
    const requestData = await req.json()
    console.log('Received request data:', JSON.stringify(requestData, null, 2))

    // Create a single timestamp for all content
    const timestamp = new Date().toISOString()
    console.log('Using timestamp for all content:', timestamp)

    // Validate the data
    const validation = validateOnboardingData(requestData)
    if (!validation.isValid) {
      console.error('Validation error:', validation.error)
      return new Response(
        JSON.stringify({
          success: false,
          message: `Invalid request data: ${validation.error}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    const { userId, websiteInfo, organizationInfo, publicationSettings, contentData } = requestData

    // Skip user verification since they just signed up
    console.log('Proceeding with onboarding for user:', userId)

    let orgData;
    
    // Only create organization if no ID is provided
    if (!organizationInfo.id) {
      // Create organization
      const { data: newOrgData, error: orgError } = await supabaseClient
        .from('organisations')
        .insert({
          name: organizationInfo.name,
          created_at: organizationInfo.created_at || timestamp
        })
        .select()
        .single()

      if (orgError) {
        console.error('Organization creation error:', orgError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to create organization',
            error: orgError.message,
            details: { organizationInfo }
          }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders 
            } 
          }
        );
      }
      
      orgData = newOrgData;
      console.log('Created new organization:', { 
        id: orgData.id, 
        name: organizationInfo.name
      });
    } else {
      // Use existing organization
      orgData = { id: organizationInfo.id };
      console.log('Using existing organization:', orgData.id);
    }

    // Create organization membership if it doesn't exist
    const { data: existingMembership } = await supabaseClient
      .from('organisation_memberships')
      .select('id')
      .eq('organisation_id', orgData.id)
      .eq('member_id', userId)
      .single();

    if (!existingMembership) {
      console.log('Creating organization membership with data:', { 
        organisation_id: orgData.id,
        member_id: userId,
        role: 'owner',
        timestamp: timestamp
      });

      const { data: membershipData, error: membershipError } = await supabaseClient
        .from('organisation_memberships')
        .insert({
          organisation_id: orgData.id,
          member_id: userId,
          role: 'owner',
          created_at: timestamp,
          updated_at: timestamp
        })
        .select('id, organisation_id, member_id, role')
        .single();

      if (membershipError) {
        console.error('Membership creation error:', membershipError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to create organization membership',
            error: membershipError.message,
            details: { userId, orgId: orgData.id }
          }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders 
            } 
          }
        )
      }

      // Verify membership was created
      if (!membershipData?.id) {
        console.error('Membership creation failed - no data returned');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to verify organization membership creation',
            details: { userId, orgId: orgData.id }
          }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders 
            } 
          }
        )
      }

      console.log('Successfully created organization membership:', membershipData);
    } else {
      console.log('User already has membership in organization:', orgData.id);
    }

    // Create website with proper organization link
    const { data: websiteData, error: websiteError } = await supabaseClient
      .from('websites')
      .insert({
        name: websiteInfo.name,
        url: websiteInfo.url,
        organisation_id: orgData.id,
        language: websiteInfo.language || 'en',
        created_at: timestamp,
        updated_at: timestamp
      })
      .select('id, name, url, organisation_id, language')
      .single()

    if (websiteError) {
      console.error('Website creation error:', JSON.stringify(websiteError))
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to create website',
          error: websiteError.message,
          details: { orgId: orgData.id, websiteInfo }
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      )
    }

    // Create website access record
    const { error: accessError } = await supabaseClient
      .from('website_access')
      .insert({
        website_id: websiteData.id,
        user_id: userId,
        access_status: 'active',
        created_at: timestamp
      });

    if (accessError) {
      console.error('Website access creation error:', accessError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to create website access',
          error: accessError.message,
          details: { websiteId: websiteData.id, userId }
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      )
    }

    console.log('Created website with organization link:', { 
      websiteId: websiteData.id, 
      orgId: orgData.id,
      url: websiteData.url
    });

    // Insert website content
    if (contentData.websiteContent && contentData.websiteContent.length > 0) {
      const websiteContent = contentData.websiteContent.map(content => ({
        website_id: websiteData.id,
        url: content.url,
        title: content.title,
        content: content.content || '',
        content_type: content.content_type || 'page',
        metadata: {
          digest: content.metadata?.digest || null,
          is_cornerstone: content.metadata?.is_cornerstone || false,
          is_key_page: content.metadata?.is_cornerstone || false,
          reason: contentData.keyContentPages?.find(k => 
            k.url?.replace(/\/$/, '').toLowerCase() === content.url?.replace(/\/$/, '').toLowerCase() || 
            k.id === content.id
          )?.reason
        },
        is_cornerstone: content.metadata?.is_cornerstone || false,
        last_fetched: content.last_fetched || timestamp,
        created_at: timestamp,
        updated_at: timestamp
      }));

      // Log summary of cornerstone content
      const cornerstonePages = websiteContent.filter(c => c.is_cornerstone);
      console.log('Cornerstone content summary:', {
        total: websiteContent.length,
        cornerstone: cornerstonePages.length,
        pages: cornerstonePages.map(c => ({
          url: c.url,
          title: c.title,
          reason: c.metadata?.reason
        }))
      });

      console.log('Inserting website content:', {
        total: websiteContent.length,
        cornerstone: websiteContent.filter(c => c.is_cornerstone).length
      });

      const { error: websiteContentError } = await supabaseClient
        .from('website_content')
        .insert(websiteContent);

      if (websiteContentError) {
        console.error('Website content insertion error:', JSON.stringify(websiteContentError));
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to store website content',
            error: websiteContentError.message
          }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders 
            } 
          }
        );
      }
    }

    // Insert post themes (from post ideas and generated content)
    if (contentData.postIdeas?.length > 0 || contentData.generatedContent) {
      console.log('Processing post ideas and generated content');
      const postThemes = [];

      // Calculate total number of posts to schedule
      const totalPosts = (contentData.postIdeas?.length || 0) + (contentData.generatedContent ? 1 : 0);
      const postingDates = getNextPostingDates(publicationSettings.posting_days, totalPosts);
      let dateIndex = 0;

      // Process generated content first
      if (contentData.generatedContent) {
        const generatedTheme = {
          website_id: websiteData.id,
          subject_matter: contentData.generatedContent.title || contentData.generatedContent.subject_matter || 'Untitled Generated Post',
          status: 'textgenerated',
          scheduled_date: postingDates[dateIndex++],
          keywords: contentData.generatedContent.tags || [],
          post_content: contentData.generatedContent.post_content || '',
          created_at: timestamp,
          updated_at: timestamp,
          wp_post_id: null,
          wp_post_url: null,
          wp_sent_date: null,
          image: null
        };
        postThemes.push(generatedTheme);
      }

      // Process regular post ideas after generated content
      if (contentData.postIdeas?.length > 0) {
        const ideaThemes = contentData.postIdeas.map(idea => ({
          website_id: websiteData.id,
          subject_matter: idea.title || 'Untitled Post',
          status: idea.liked ? 'approved' : 'pending',
          scheduled_date: idea.liked ? postingDates[dateIndex++] : null,
          keywords: idea.tags || [],
          post_content: idea.post_content || '',
          created_at: timestamp,
          updated_at: timestamp,
          wp_post_id: null,
          wp_post_url: null,
          wp_sent_date: null,
          image: null
        }));
        postThemes.push(...ideaThemes);
      }

      console.log('Inserting post themes with scheduled dates:', JSON.stringify(postThemes.map(theme => ({
        title: theme.subject_matter,
        status: theme.status,
        scheduled_date: theme.scheduled_date
      })), null, 2));

      const { error: postThemesError } = await supabaseClient
        .from('post_themes')
        .insert(postThemes);

      if (postThemesError) {
        console.error('Post themes insertion error:', postThemesError);
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to store post themes' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // Insert publication settings
    const { error: settingsError } = await supabaseClient
      .from('publication_settings')
      .insert({
        website_id: websiteData.id,
        organisation_id: orgData.id,
        posting_frequency: publicationSettings.posting_frequency,
        posting_days: publicationSettings.posting_days,
        writing_style: publicationSettings.writing_style,
        subject_matters: publicationSettings.subject_matters,
        wordpress_template: publicationSettings.wordpress_template || null,
        image_prompt: publicationSettings.image_prompt || null,
        negative_prompt: publicationSettings.negative_prompt || null,
        created_at: timestamp,
        updated_at: timestamp
      })

    if (settingsError) {
      console.error('Publication settings insertion error:', settingsError)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to store publication settings' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Return success response with IDs
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Onboarding completed successfully',
        data: {
          organisation_id: orgData.id,
          website_id: websiteData.id
        }
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'An unexpected error occurred',
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    )
  }
}) 