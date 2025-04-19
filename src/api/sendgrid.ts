import { SENDGRID_API_KEY } from '@/config';

export async function sendWeeklyPlanningEmail(to: string, subject: string, content: string) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }]
        }],
        from: {
          email: 'planning@contentgardener.ai',
          name: 'ContentGardener.ai'
        },
        subject: subject,
        content: [{
          type: 'text/html',
          value: content
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Test function
export async function sendTestEmail() {
  const testContent = `
    <h2>Weekly Content Plan Test</h2>
    <p>This is a test email for the weekly content planning system.</p>
    <p>Here are some example planned posts:</p>
    
    <ul>
      <li>
        <strong>Test Post 1</strong><br>
        Scheduled for: ${new Date(Date.now() + 86400000).toLocaleDateString()}<br>
        Keywords: test, content, ai<br>
        Categories: Test Category
      </li>
      <li>
        <strong>Test Post 2</strong><br>
        Scheduled for: ${new Date(Date.now() + 172800000).toLocaleDateString()}<br>
        Keywords: test, content, ai<br>
        Categories: Test Category
      </li>
      <li>
        <strong>Test Post 3</strong><br>
        Scheduled for: ${new Date(Date.now() + 259200000).toLocaleDateString()}<br>
        Keywords: test, content, ai<br>
        Categories: Test Category
      </li>
    </ul>
    
    <p>You can review and edit these posts in your <a href="https://app.contentgardener.ai/dashboard">Content Calendar</a>.</p>
    
    <p><small>This is a test email. The regular weekly planning emails will be sent on your chosen planning day.</small></p>
  `;

  return sendWeeklyPlanningEmail(
    'philipleth@gmail.com',
    '[TEST] Weekly Content Plan',
    testContent
  );
} 