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
        websites (
          id,
          name,
          url
        ),
        organisations (
          id,
          name
        )
      `)
      .eq('weekly_planning_day', today)
      .eq('is_active', true) // Only process active settings

    if (settingsError) {
      throw settingsError
    }

    console.log(`Found ${settings?.length || 0} websites scheduled for ${today}'s content planning`)

    // Process each website's content planning
    const results = await Promise.all((settings || []).map(async (setting) => {
      try {
        // Generate post ideas based on posting_frequency
        const postIdeas = await generatePostIdeas(setting)

        // Insert into content calendar
        const { data: calendarEntries, error: calendarError } = await supabaseClient
          .from('post_themes')
          .insert(postIdeas)
          .select()

        if (calendarError) {
          throw calendarError
        }

        // Send email notification
        await sendPlanningEmail(setting, calendarEntries)

        return {
          website_id: setting.website_id,
          success: true,
          posts_generated: postIdeas.length
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
async function generatePostIdeas(setting: any) {
  try {
    // Import the AI service endpoints
    const { fetchWebsiteContent } = await import('@/api/aiEndpoints')
    const { generateTitleSuggestions } = await import('@/services/aiService')
    
    // Fetch website content for context
    const content = await fetchWebsiteContent(setting.websites.url, setting.website_id)
    console.log(`Fetched website content for ${setting.websites.url} (${content.length} characters)`)
    
    // Generate title suggestions using AI
    const result = await generateTitleSuggestions(
      content,
      setting.subject_matters, // Use configured subject matters as keywords
      setting.writing_style,   // Use configured writing style
      setting.subject_matters, // Focus on configured subjects
      setting.website_id
    )
    
    // Map the suggestions to post themes
    return result.titles.map((title, index) => ({
      website_id: setting.website_id,
      subject_matter: title,
      status: 'pending',
      scheduled_date: getNextPostDate(index),
      keywords: result.keywordsByTitle?.[title] || result.keywords || setting.subject_matters,
      categories: (result.categoriesByTitle?.[title] || result.categories || []).map(cat => ({
        id: `temp-${Math.random()}`,
        name: cat,
        slug: cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      }))
    }))
  } catch (error) {
    console.error(`Error generating post ideas for website ${setting.website_id}:`, error)
    throw error
  }
}

// Helper function to get next post date
function getNextPostDate(daysToAdd: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysToAdd + 1) // Start from tomorrow
  return date.toISOString()
}

// Helper function to send email notification
async function sendPlanningEmail(setting: any, posts: any[]) {
  try {
    // Get admin users for the organization
    const { data: adminUsers, error: usersError } = await supabaseClient
      .from('organisation_memberships')
      .select(`
        user_id,
        users (
          email,
          full_name
        )
      `)
      .eq('organisation_id', setting.organisation_id)
      .eq('role', 'admin')

    if (usersError) throw usersError

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
                <strong>Scheduled:</strong> ${new Date(post.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
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

    // Send email to each admin using SendGrid
    const emailPromises = adminUsers.map(async (admin) => {
      if (!admin.users?.email) return

      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: admin.users.email }]
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
    })

    await Promise.all(emailPromises)
    console.log(`Sent planning emails to ${emailPromises.length} admins for website:`, setting.websites.name)
  } catch (error) {
    console.error('Error sending planning emails:', error)
    throw error
  }
} 