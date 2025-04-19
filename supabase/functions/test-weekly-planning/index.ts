import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Test weekly planning function loaded')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting test email send...')
    
    // Send test email directly
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: 'philipleth@gmail.com' }]
        }],
        from: {
          email: 'planning@contentgardener.ai',
          name: 'ContentGardener.ai'
        },
        subject: `[TEST] Weekly Content Plan`,
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2D3748; margin: 0;">🌱 Your Weekly Garden Plan</h1>
                <p style="color: #718096; margin-top: 10px;">Fresh content seeds ready to be planted</p>
              </div>

              <div style="background: #F7FAFC; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h2 style="color: #2D3748; margin: 0 0 15px 0;">Content Seeds for Next Week</h2>
                <p style="color: #4A5568; margin-bottom: 20px;">Here are your carefully selected content ideas, ready to grow into engaging posts:</p>
                
                <div style="background: white; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
                  <h3 style="color: #2D3748; margin: 0 0 10px 0;">Test Post 1</h3>
                  <p style="color: #4A5568; margin: 0 0 5px 0;">
                    <strong>Scheduled:</strong> ${new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <p style="color: #718096; margin: 0;">
                    <span style="background: #EBF4FF; color: #4299E1; padding: 2px 8px; border-radius: 12px; font-size: 14px; margin-right: 5px;">test</span>
                    <span style="background: #EBF4FF; color: #4299E1; padding: 2px 8px; border-radius: 12px; font-size: 14px; margin-right: 5px;">content</span>
                    <span style="background: #EBF4FF; color: #4299E1; padding: 2px 8px; border-radius: 12px; font-size: 14px;">ai</span>
                  </p>
                </div>

                <div style="background: white; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
                  <h3 style="color: #2D3748; margin: 0 0 10px 0;">Test Post 2</h3>
                  <p style="color: #4A5568; margin: 0 0 5px 0;">
                    <strong>Scheduled:</strong> ${new Date(Date.now() + 172800000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <p style="color: #718096; margin: 0;">
                    <span style="background: #EBF4FF; color: #4299E1; padding: 2px 8px; border-radius: 12px; font-size: 14px; margin-right: 5px;">test</span>
                    <span style="background: #EBF4FF; color: #4299E1; padding: 2px 8px; border-radius: 12px; font-size: 14px; margin-right: 5px;">content</span>
                    <span style="background: #EBF4FF; color: #4299E1; padding: 2px 8px; border-radius: 12px; font-size: 14px;">ai</span>
                  </p>
                </div>

                <div style="background: white; border-radius: 6px; padding: 15px;">
                  <h3 style="color: #2D3748; margin: 0 0 10px 0;">Test Post 3</h3>
                  <p style="color: #4A5568; margin: 0 0 5px 0;">
                    <strong>Scheduled:</strong> ${new Date(Date.now() + 259200000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <p style="color: #718096; margin: 0;">
                    <span style="background: #EBF4FF; color: #4299E1; padding: 2px 8px; border-radius: 12px; font-size: 14px; margin-right: 5px;">test</span>
                    <span style="background: #EBF4FF; color: #4299E1; padding: 2px 8px; border-radius: 12px; font-size: 14px; margin-right: 5px;">content</span>
                    <span style="background: #EBF4FF; color: #4299E1; padding: 2px 8px; border-radius: 12px; font-size: 14px;">ai</span>
                  </p>
                </div>
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
        }]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SendGrid API error:', error)
      throw new Error(`SendGrid API error: ${error}`)
    }

    console.log('Email sent successfully!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test email sent to philipleth@gmail.com'
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
        status: 500,
      }
    )
  }
})

// Helper function to get next post date
function getNextPostDate(daysToAdd: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysToAdd + 1) // Start from tomorrow
  return date.toISOString()
} 