// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get allowed origins from environment variables
const ALLOWED_ORIGINS = {
  production: Deno.env.get('ALLOWED_ORIGINS_PROD') ? 
    Deno.env.get('ALLOWED_ORIGINS_PROD')?.split(',') || ['https://contentgardener.ai', 'https://contentgardener.ai/'] : 
    ['https://contentgardener.ai', 'https://contentgardener.ai/'],
  staging: Deno.env.get('ALLOWED_ORIGINS_STAGING') ? 
    Deno.env.get('ALLOWED_ORIGINS_STAGING')?.split(',') || ['https://staging.contentgardener.ai', 'http://localhost:8080'] : 
    ['https://staging.contentgardener.ai', 'http://localhost:8080']
};

// Function to determine if origin is allowed
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // In development, allow all origins
  if (Deno.env.get('ENVIRONMENT') === 'development') return true;
  
  // Check against allowed origins based on environment
  const allowedOrigins = Deno.env.get('ENVIRONMENT') === 'production' 
    ? ALLOWED_ORIGINS.production 
    : ALLOWED_ORIGINS.staging;
    
  return allowedOrigins.some(allowed => origin.trim() === allowed.trim());
}

// Handle CORS headers generation
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  const allowedOrigin = isAllowedOrigin(origin) ? origin || ALLOWED_ORIGINS.production[0] : ALLOWED_ORIGINS.production[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400' // 24 hours caching of preflight requests
  };
}

console.log('Test weekly planning function loaded')

serve(async (req) => {
  // Get CORS headers for this request
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    // Initialize Supabase client with service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )

    // Get the day of week from the request query or use current day
    const { day } = await req.json();
    const targetDay = day ? day.toLowerCase() : new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    console.log(`Starting weekly planning for ${targetDay}`)

    // First, let's check all publication settings to see what we have
    const { data: allSettings, error: allSettingsError } = await supabaseClient
      .from('publication_settings')
      .select(`
        id,
        website_id,
        weekly_planning_day,
        posting_frequency,
        is_active,
        websites (id, name, url, language)
      `)

    if (allSettingsError) {
      console.error('Error fetching all settings:', allSettingsError)
    } else {
      console.log(`Total settings: ${allSettings?.length || 0}, Active settings for ${targetDay}: ${allSettings?.filter(s => s.weekly_planning_day?.toLowerCase() === targetDay && s.is_active).length || 0}`)
    }

    // Fetch all publication settings where weekly_planning_day matches the specified day
    const { data: settings, error: settingsError } = await supabaseClient
      .from('publication_settings')
      .select(`
        id,
        website_id,
        organisation_id,
        posting_frequency,
        writing_style,
        subject_matters,
        weekly_planning_day,
        is_active,
        websites (id, name, url, language)
      `)
      .eq('weekly_planning_day', targetDay)
      .eq('is_active', true)

    if (settingsError) {
      throw settingsError
    }

    console.log(`Found ${settings?.length || 0} active websites scheduled for ${targetDay}'s content planning`)

    // Process each website's content planning
    const results = await Promise.all((settings || []).map(async (setting) => {
      try {
        if (!setting.organisation_id) {
          throw new Error(`No organisation_id found for website ${setting.website_id}`)
        }

        // Get organisation details
        const { data: orgData, error: orgError } = await supabaseClient
          .from('organisations')
          .select('id, name')
          .eq('id', setting.organisation_id)
          .single()
        
        if (orgError) {
          throw orgError
        }
        
        // First generate the posts
        const postIdeas = await generatePostIdeas(setting, supabaseClient)

        if (!postIdeas || postIdeas.length === 0) {
          console.log(`No new posts needed for website ${setting.website_id} (${setting.websites?.name || 'Unknown'})`)
          return {
            website_id: setting.website_id,
            success: true,
            posts_generated: 0
          }
        }

        // Then insert them into the calendar
        const { data: calendarEntries, error: calendarError } = await supabaseClient
          .from('post_themes')
          .insert(postIdeas)
          .select()

        if (calendarError) {
          throw calendarError
        }

        if (!calendarEntries || calendarEntries.length === 0) {
          throw new Error('Posts were generated but failed to be inserted into calendar')
        }

        console.log(`Generated and inserted ${calendarEntries.length} posts for website ${setting.website_id} (${setting.websites?.name || 'Unknown'})`)

        // Finally send the email with the confirmed posts
        try {
        await sendPlanningEmail(setting, calendarEntries, orgData, supabaseClient)
          return {
            website_id: setting.website_id,
            success: true,
            posts_generated: calendarEntries.length
          }
        } catch (emailError) {
          console.error(`Failed to send planning email for website ${setting.website_id}:`, emailError)
        return {
          website_id: setting.website_id,
          success: true,
            posts_generated: calendarEntries.length,
            email_error: emailError.message
          }
        }
      } catch (error) {
        console.error(`Error processing website ${setting.website_id}:`, error)
        return {
          website_id: setting.website_id,
          success: false,
          error: error.message
        }
      }
    }))

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Test completed for ${targetDay}. Processed ${results.length} websites.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Helper function to generate post ideas
async function generatePostIdeas(setting: any, supabaseClient: any) {
  try {
    // Calculate the date range for the next 7 days
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 7)
    
    console.log('Checking publication settings:', {
      website_id: setting.website_id,
      posting_frequency: setting.posting_frequency,
      posting_days: setting.posting_days
    })

    // First check existing posts for this date range
    const { data: existingPosts, error: existingError } = await supabaseClient
      .from('post_themes')
      .select('id, scheduled_date, status')
      .eq('website_id', setting.website_id)
      .gte('scheduled_date', startDate.toISOString())
      .lte('scheduled_date', endDate.toISOString())
      .neq('status', 'declined')  // Changed to use neq instead of not in
      .order('scheduled_date', { ascending: true })

    if (existingError) {
      console.error('Error fetching existing posts:', existingError)
      throw existingError
    }

    // Double check what posts we got back
    console.log('Existing posts found:', existingPosts?.map(p => ({
      id: p.id,
      date: p.scheduled_date,
      status: p.status
    })))

    // Get the posting frequency and days
    const postsPerWeek = setting.posting_frequency || 1
    let postingDays = setting.posting_days || []
    
    // Validate posting days configuration
    if (!Array.isArray(postingDays) || postingDays.length === 0) {
      console.log('No posting days configured or invalid configuration, using default (1 post per day)')
      // Default to allowing posts on any day if no configuration
      postingDays = [
        { day: 'monday', count: 1 },
        { day: 'tuesday', count: 1 },
        { day: 'wednesday', count: 1 },
        { day: 'thursday', count: 1 },
        { day: 'friday', count: 1 }
      ]
    }
    
    console.log('Settings after validation:', {
      postsPerWeek,
      postingDays,
      existingPosts: existingPosts?.length || 0,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })
    
    // First update any existing pending posts to approved
    const pendingPosts = existingPosts?.filter(p => p.status === 'pending') || []
    if (pendingPosts.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('post_themes')
        .update({ status: 'approved' })
        .in('id', pendingPosts.map(p => p.id))

      if (updateError) {
        throw updateError
      }
      console.log(`Updated ${pendingPosts.length} existing posts to approved status`)
    }

    // Calculate how many new posts we need
    // Only count active posts (not pending or declined)
    const activePostsCount = existingPosts?.filter(p => 
      p.status !== 'pending' && p.status !== 'declined'
    ).length || 0
    
    const postsNeeded = Math.max(0, postsPerWeek - activePostsCount)
    console.log(`Posts needed calculation:`, {
      postsPerWeek,
      activePostsCount,
      postsNeeded
    })

    if (postsNeeded <= 0) {
      console.log(`No new posts needed - already have ${activePostsCount} active posts`)
      return []
    }

    // Get available dates based on posting days
    const availableDates = []
    // Only consider dates that have active posts
    const existingDates = new Set(
      existingPosts
        ?.filter(p => p.status !== 'declined')
        .map(p => p.scheduled_date.split('T')[0]) || []
    )
    
    // Create a map of day names to their counts
    const dayCountMap = postingDays.reduce((acc: any, day: { day: string; count: number }) => {
      acc[day.day.toLowerCase()] = day.count;
      return acc;
    }, {});

    console.log('Day count map:', dayCountMap)
    
    // Find available dates for the next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const dateStr = date.toISOString().split('T')[0]
      
      // Count active posts for this day
      const existingPostsForDay = existingPosts?.filter(p => {
        const postDate = new Date(p.scheduled_date)
        return postDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === dayName &&
               p.status !== 'declined'
      }).length || 0

      console.log('Checking date:', {
        date: dateStr,
        dayName,
        isPostingDay: !!dayCountMap[dayName],
        hasExistingPost: existingDates.has(dateStr),
        existingPostsForDay,
        maxPostsForDay: dayCountMap[dayName],
        canAddPost: dayCountMap[dayName] && existingPostsForDay < dayCountMap[dayName]
      })

      if (dayCountMap[dayName] && existingPostsForDay < dayCountMap[dayName]) {
        availableDates.push(date)
        console.log(`Added ${dateStr} (${dayName}) as available date`)
      }
    }

    if (availableDates.length === 0) {
      console.log(`No available dates found. Configuration:`, {
        postingDays,
        existingDates: Array.from(existingDates),
        dayCountMap
      })
      return []
    }

    // Generate new post ideas only if needed
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-post-ideas`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      },
      body: JSON.stringify({
        website_id: setting.website_id,
        website_url: setting.websites?.url,
        keywords: setting.subject_matters || [],
        writing_style: setting.writing_style || 'professional',
        subject_matters: setting.subject_matters || [],
        language: setting.websites?.language || 'en',
        count: Math.min(postsNeeded, availableDates.length)
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to generate post ideas: ${errorText}`)
    }

    const result = await response.json()
    
    if (!result.success || !result.ideas || !Array.isArray(result.ideas)) {
      console.error('Generate post ideas failed:', result)
      return []
    }

    // Create new posts with proper date distribution
    const newPosts = result.ideas.map((idea: any, index: number) => {
      const scheduledDate = availableDates[index];
      return {
        website_id: setting.website_id,
        subject_matter: idea.title,
        keywords: idea.keywords || setting.subject_matters || [],
        status: 'approved',
        scheduled_date: scheduledDate.toISOString()
      };
    });

    console.log(`Generated ${newPosts.length} new posts for website ${setting.website_id} with dates: ${newPosts.map(p => p.scheduled_date).join(', ')}`);
    return newPosts;
  } catch (error) {
    throw error
  }
}

// Helper function to send email notification
async function sendPlanningEmail(setting: any, posts: any[], orgData: any, supabaseClient: any) {
  try {
    console.log('Fetching admin users for organisation:', setting.organisation_id)
    
    // First get the admin memberships
    const { data: adminMemberships, error: membershipsError } = await supabaseClient
      .from('organisation_memberships')
      .select('member_id')
      .eq('organisation_id', setting.organisation_id)
      .eq('role', 'admin')

    if (membershipsError) {
      console.error('Error fetching admin memberships:', membershipsError)
      throw membershipsError
    }

    if (!adminMemberships?.length) {
      console.warn('No admin memberships found for organisation:', setting.organisation_id)
      return // Skip sending emails if no admins found
    }

    // Then get the admin users' details using the Admin API
    const { data: adminUsers, error: usersError } = await supabaseClient.auth.admin.listUsers({
      perPage: 100,
      page: 1
    })

    if (usersError) {
      console.error('Error fetching admin users:', usersError)
      throw usersError
    }

    // Filter users to only include our admin members
    const memberIds = adminMemberships.map(m => m.member_id)
    const filteredAdminUsers = adminUsers?.users?.filter(user => 
      memberIds.includes(user.id)
    ) || []

    console.log(`Found ${filteredAdminUsers.length} admin users for organisation ${setting.organisation_id}`)
    if (!filteredAdminUsers.length) {
      console.warn('No admin users found for organisation:', setting.organisation_id)
      return // Skip sending emails if no admins found
    }

    // Format the email content with improved styling
    const emailContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D3748; margin: 0;">🌱 Your Weekly Garden Plan</h1>
          <p style="color: #718096; margin-top: 10px;">Fresh content seeds ready to be planted</p>
        </div>

        <div style="background: #F7FAFC; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h2 style="color: #2D3748; margin: 0 0 15px 0;">Content Seeds for Next Week</h2>
          <p style="color: #4A5568; margin-bottom: 20px;">Here are your carefully selected content ideas, ready to grow into engaging posts:</p>
          
          ${posts.map((post, index) => `
            <div style="background: white; border-radius: 6px; padding: 15px; margin-bottom: ${index < posts.length - 1 ? '15px' : '0'};">
              <h3 style="color: #2D3748; margin: 0 0 10px 0;">${post.subject_matter}</h3>
              <p style="color: #4A5568; margin: 0 0 5px 0;">
                <strong>Scheduled:</strong> ${new Date(post.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <p style="color: #718096; margin: 0;">
                ${Array.isArray(post.keywords) ? post.keywords.join(', ') : ''}
              </p>
            </div>
          `).join('\n')}
        </div>

        <div style="text-align: center;">
          <a href="https://contentgardener.ai/calendar" 
             style="display: inline-block; background: #4299E1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            View in Content Calendar
          </a>
          <p style="color: #718096; margin-top: 20px; font-size: 14px;">
            Your content garden is growing! 🌱<br>
            Review and nurture these ideas in your dashboard.
          </p>
        </div>
      </div>
    `

    // Send email to each admin using SendGrid
    const emailPromises = filteredAdminUsers.map(async (admin) => {
      if (!admin.email) {
        console.warn('No email found for admin user:', admin.id)
        return
      }

      console.log('Sending email to:', admin.email)
      
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: admin.email }]
          }],
          from: {
            email: 'planning@contentgardener.ai',
            name: 'ContentGardener.ai'
          },
          subject: `Weekly Content Plan for ${setting.websites.name}`,
          content: [{
            type: 'text/html',
            value: emailContent
          }]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error sending email:', errorText)
        throw new Error(`Failed to send email: ${errorText}`)
      }
    })

    await Promise.all(emailPromises)
    console.log(`Sent planning emails to ${emailPromises.length} admins for website:`, setting.websites.name)
  } catch (error) {
    console.error('Error sending planning emails:', error)
    throw error
  }
}