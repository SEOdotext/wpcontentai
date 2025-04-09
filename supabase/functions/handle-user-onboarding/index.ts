import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface OnboardingData {
  userId: string
  websiteInfo: {
    name: string
    url: string
  }
  organizationInfo: {
    name: string
  }
  publicationSettings: {
    posting_frequency: number
    posting_days: Array<{ day: string, count: number }>
    writing_style: string
    subject_matters: string[]
  }
  contentData?: {
    postIdeas: Array<{
      title: string
      tags: string[]
      liked: boolean
    }>
    generatedContent?: {
      title: string
      content: string
      status: string
    }
    websiteContent?: Array<{
      url: string
      title: string
      content: string
      content_type?: string
      digest?: string
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const { userId, websiteInfo, organizationInfo, publicationSettings, contentData }: OnboardingData = requestData

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing Supabase configuration'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    console.log('Supabase URL configured:', !!supabaseUrl)
    console.log('Supabase key configured:', !!supabaseKey)

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    // Verify the user exists and is authenticated
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userError || !userData.user) {
      console.error('Error verifying user:', userError)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid or unauthorized user'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Check if user already has an organization
    const { data: existingMemberships } = await supabaseAdmin
      .from('organisation_memberships')
      .select('organisation_id')
      .eq('member_id', userId)

    if (existingMemberships && existingMemberships.length > 0) {
      console.error('User already has organization memberships:', existingMemberships)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User already belongs to an organization'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    try {
      // 1. Create organization first
      const { data: orgData, error: orgError } = await supabaseAdmin
        .from('organisations')
        .insert([{
          id: crypto.randomUUID(),
          name: organizationInfo.name,
          created_at: timestamp  // Only these fields exist in the schema
        }])
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        throw new Error(`Error creating organization: ${orgError.message}`);
      }

      // 2. Create organization membership for the user
      const { error: membershipError } = await supabaseAdmin
        .from('organisation_memberships')
        .insert([{
          id: crypto.randomUUID(),
          member_id: userId,
          organisation_id: orgData.id,
          role: 'owner',
          created_at: timestamp
        }]);

      if (membershipError) {
        console.error('Error creating organization membership:', membershipError);
        throw new Error(`Error creating organization membership: ${membershipError.message}`);
      }

      // 3. Create website with organization association
      const { data: websiteData, error: websiteError } = await supabaseAdmin
        .from('websites')
        .insert([{
          id: crypto.randomUUID(),
          name: websiteInfo.name,
          url: websiteInfo.url,
          organisation_id: orgData.id,
          created_at: timestamp,
          updated_at: timestamp
        }])
        .select()
        .single();

      if (websiteError) {
        console.error('Error creating website:', websiteError);
        throw new Error(`Error creating website: ${websiteError.message}`);
      }

      // 4. Create website access for the user
      const { error: accessError } = await supabaseAdmin
        .from('website_access')
        .insert([{
          id: crypto.randomUUID(),
          user_id: userId,
          website_id: websiteData.id,
          access_status: 'owner',
          created_at: timestamp
        }]);

      if (accessError) {
        console.error('Error creating website access:', accessError);
        throw new Error(`Error creating website access: ${accessError.message}`);
      }

      // Now proceed with the rest of the data transfers using the created IDs
      // Website content
      if (contentData?.websiteContent) {
        console.log('Storing website content from sitemap...');
        
        try {
          const websiteLanguage = websiteData.language || 'en';
          
          const sortedContent = [...contentData.websiteContent].sort((a, b) => {
            if (a.digest && !b.digest) return -1;
            if (!a.digest && b.digest) return 1;
            return 0;
          });

          const formattedContent = sortedContent.map((page, index) => ({
            id: crypto.randomUUID(),
            website_id: websiteData.id,
            url: page.url,
            title: page.title || '',
            content: page.content || '',  // Required field
            content_type: page.content_type || 'page',  // Required field
            is_cornerstone: index < 5,  // Boolean field for first 5 pages
            digest: page.digest || null,
            metadata: {},  // JSONB field, initialize as empty object
            created_at: timestamp,
            updated_at: timestamp,
            last_fetched: timestamp,
            language: websiteLanguage  // Required field
          }));

          console.log(`Processing ${formattedContent.length} pages, including ${formattedContent.filter(p => p.is_cornerstone).length} cornerstone pages`);

          // Insert website content in batches to handle large sitemaps
          const batchSize = 50;
          for (let i = 0; i < formattedContent.length; i += batchSize) {
            const batch = formattedContent.slice(i, i + batchSize);
            const { error: contentError } = await supabaseAdmin
              .from('website_content')
              .insert(batch);

            if (contentError) {
              console.error(`Error storing website content batch ${i/batchSize + 1}:`, contentError);
              throw new Error(`Error storing website content: ${contentError.message}`);
            }
            console.log(`Successfully stored batch ${i/batchSize + 1} of website content`);
          }

          console.log(`Successfully stored all ${formattedContent.length} website pages`);
        } catch (error) {
          console.error('Error in website content processing:', error);
          return new Response(
            JSON.stringify({
              success: false,
              message: `Error storing website content: ${error.message}`
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          );
        }
      }

      // Post ideas
      if (contentData?.postIdeas) {
        console.log('Storing post ideas...');

        try {
          const formattedIdeas = contentData.postIdeas.map(idea => ({
            id: crypto.randomUUID(),
            website_id: websiteData.id,
            subject_matter: idea.title || '',  // Required field
            keywords: Array.isArray(idea.tags) ? idea.tags : [],
            status: idea.liked ? 'approved' : 'pending',  // Required field
            post_content: null,  // Correct column name
            scheduled_date: null,
            created_at: timestamp,  // Required field
            updated_at: timestamp,  // Required field
            wp_post_id: null,
            wp_post_url: null,
            wp_sent_date: null,
            image: null
          }));

          // Insert post ideas
          const { error: ideasError } = await supabaseAdmin
            .from('post_themes')
            .insert(formattedIdeas);

          if (ideasError) {
            console.error('Error storing post ideas:', ideasError);
            throw new Error(`Error storing post ideas: ${ideasError.message}`);
          }

          console.log(`Successfully stored ${formattedIdeas.length} post ideas`);
        } catch (error) {
          console.error('Error in post ideas processing:', error);
          throw error;
        }
      }

      // Generated content
      if (contentData?.generatedContent) {
        try {
          const formattedPost = {
            id: crypto.randomUUID(),
            website_id: websiteData.id,
            subject_matter: contentData.generatedContent.title || '',  // Required field
            keywords: [],  // Required field
            status: 'textgenerated',  // Required field
            post_content: contentData.generatedContent.content || '',  // Correct column name
            scheduled_date: null,
            created_at: timestamp,  // Required field
            updated_at: timestamp,  // Required field
            wp_post_id: null,
            wp_post_url: null,
            wp_sent_date: null,
            image: null
          };

          const { error: contentError } = await supabaseAdmin
            .from('post_themes')
            .insert([formattedPost]);

          if (contentError) {
            console.error('Error inserting generated content:', contentError);
            throw new Error(`Error inserting generated content: ${contentError.message}`);
          }
        } catch (error) {
          console.error('Error in generated content processing:', error);
          throw error;
        }
      }

      // Publication settings
      if (publicationSettings) {
        const { error: settingsError } = await supabaseAdmin
          .from('publication_settings')
          .insert([{
            id: crypto.randomUUID(),
            website_id: websiteData.id,
            organisation_id: orgData.id,
            posting_frequency: publicationSettings.posting_frequency,
            posting_days: publicationSettings.posting_days,
            writing_style: publicationSettings.writing_style || 'Professional and informative',
            created_at: timestamp,
            updated_at: timestamp
          }]);

        if (settingsError) {
          console.error('Error storing publication settings:', settingsError);
          throw new Error(`Error storing publication settings: ${settingsError.message}`);
        }
      }

      // Return success with the created IDs
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );

    } catch (error) {
      console.error('Error in onboarding process:', error)
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

  } catch (error) {
    console.error('Error in onboarding process:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}) 