import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Weekly content planning function loaded')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current day of week (lowercase)
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    console.log(`Running weekly planning for ${today}`)

    // Fetch all publication settings where weekly_planning_day matches today
    const { data: settings, error: settingsError } = await supabaseClient
      .from('publication_settings')
      .select(`
        id,
        website_id,
        posting_frequency,
        writing_style,
        subject_matters,
        organisation_id,
        weekly_planning_day,
        is_active,
        websites (
          id,
          name,
          url
        )
      `)
      .eq('weekly_planning_day', today)
      .eq('is_active', true)

    if (settingsError) {
      throw settingsError
    }

    console.log(`Found ${settings?.length || 0} websites scheduled for ${today}'s content planning`)

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
          console.error(`Error fetching organisation for website ${setting.website_id}:`, orgError)
          throw orgError
        }

        // First generate and insert the posts
        const postIdeas = await generatePostIdeas(setting, supabaseClient)

        if (!postIdeas || postIdeas.length === 0) {
          console.log(`No new posts needed for website ${setting.website_id} (${setting.websites?.name || 'Unknown'})`)
          return {
            website_id: setting.website_id,
            success: true,
            posts_generated: 0
          }
        }

        // Insert into content calendar
        const { data: calendarEntries, error: calendarError } = await supabaseClient
          .from('post_themes')
          .insert(postIdeas)
          .select()

        if (calendarError) {
          console.error(`Failed to insert posts for website ${setting.website_id}:`, calendarError)
          throw calendarError
        }

        if (!calendarEntries || calendarEntries.length === 0) {
          throw new Error('Posts were generated but failed to be inserted into calendar')
        }

        console.log(`Generated and inserted ${calendarEntries.length} posts for website ${setting.website_id} (${setting.websites?.name || 'Unknown'})`)

        // Then send the email with the confirmed posts
        try {
          const emailResult = await sendPlanningEmail(setting, calendarEntries, orgData, supabaseClient)
          return {
            website_id: setting.website_id,
            success: true,
            posts_generated: calendarEntries.length,
            email_sent: true,
            recipients: emailResult.recipients
          }
        } catch (emailError) {
          console.error(`Failed to send planning email for website ${setting.website_id}:`, emailError)
          return {
            website_id: setting.website_id,
            success: true,
            posts_generated: calendarEntries.length,
            email_sent: false,
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
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
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

    // Check existing posts
    const { data: existingPosts, error: existingError } = await supabaseClient
      .from('post_themes')
      .select('scheduled_date')
      .eq('website_id', setting.website_id)
      .gte('scheduled_date', startDate.toISOString())
      .lte('scheduled_date', endDate.toISOString())

    if (existingError) {
      throw existingError
    }

    // Get the posting frequency
    const postsPerWeek = setting.posting_frequency || 1

    // Calculate how many posts we need
    const postsNeeded = Math.max(0, postsPerWeek - (existingPosts?.length || 0))

    if (postsNeeded <= 0) {
      return []
    }

    // Call the generate-post-ideas function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-post-ideas`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        website_id: setting.website_id,
        website_url: setting.websites?.url,
        keywords: setting.subject_matters || [],
        writing_style: setting.writing_style || 'professional',
        subject_matters: setting.subject_matters || [],
        count: postsNeeded
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to generate post ideas: ${errorText}`)
    }

    const result = await response.json()
    
    if (!result.ideas || !Array.isArray(result.ideas)) {
      return []
    }

    // Get available dates (excluding dates with existing posts)
    const existingDates = new Set(existingPosts?.map(p => p.scheduled_date.split('T')[0]) || [])
    const availableDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      if (!existingDates.has(dateStr)) {
        availableDates.push(date)
      }
    }

    // Map ideas to posts with scheduled dates
    return result.ideas.map((idea: any, index: number) => {
      const scheduledDate = availableDates[index % availableDates.length]
      return {
        website_id: setting.website_id,
        subject_matter: idea.title,
        keywords: idea.keywords || setting.subject_matters || [],
        status: 'approved',
        scheduled_date: scheduledDate.toISOString()
      }
    })
  } catch (error) {
    throw error
  }
}

// Helper function to send email notification
async function sendPlanningEmail(setting: any, posts: any[], orgData: any, supabaseClient: any) {
  try {
    // Validate inputs
    if (!Array.isArray(posts) || posts.length === 0) {
      throw new Error('No valid posts provided for email')
    }

    if (!setting?.website_id || !setting?.organisation_id) {
      throw new Error('Invalid website or organisation settings')
    }

    // Get admin memberships and users
    const { data: adminMemberships, error: membershipsError } = await supabaseClient
      .from('organisation_memberships')
      .select('member_id')
      .eq('organisation_id', setting.organisation_id)
      .eq('role', 'admin')

    if (membershipsError) throw membershipsError

    if (!adminMemberships?.length) {
      throw new Error('No admin memberships found')
    }

    const { data: adminUsers, error: usersError } = await supabaseClient.auth.admin.listUsers({
      perPage: 100,
      page: 1
    })

    if (usersError) throw usersError

    const memberIds = adminMemberships.map(m => m.member_id)
    const filteredAdminUsers = adminUsers?.users?.filter(user => memberIds.includes(user.id)) || []

    if (!filteredAdminUsers.length) {
      throw new Error('No admin users found')
    }

    // Format the email content
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
                ${Array.isArray(post.keywords) ? post.keywords.map(keyword => 
                  `<span style="background: #EBF4FF; color: #4299E1; padding: 2px 8px; border-radius: 12px; font-size: 14px; margin-right: 5px;">${keyword}</span>`
                ).join('') : ''}
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

    // Send emails
    const emailPromises = filteredAdminUsers.map(async (admin) => {
      if (!admin.email) return null

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
        throw new Error(`Failed to send email to ${admin.email}: ${errorText}`)
      }

      return admin.email
    })

    const sentEmails = (await Promise.all(emailPromises)).filter(Boolean)
    
    return {
      success: true,
      recipients: sentEmails
    }
  } catch (error) {
    throw error
  }
} 