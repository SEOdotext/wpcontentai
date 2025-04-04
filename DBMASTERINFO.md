# Database Master Information

## Email Configuration in Supabase

To properly enable email sending in the application, you need to configure the SMTP settings in your Supabase project:

1. Navigate to your Supabase project dashboard
2. Go to Authentication → Email Templates
3. Configure SMTP settings with your email provider details:
   - Host: Your SMTP server (e.g., smtp.gmail.com)
   - Port: SMTP port (usually 465 for SSL or 587 for TLS)
   - Username: Your email address
   - Password: Your email password or app-specific password
   - Enable TLS/SSL: Usually enabled

### Important Notes

- For Gmail, you'll need to create an app-specific password
- Make sure your email provider allows sending from your application
- Test the configuration by sending a test email from the dashboard
- Update the site URL in the project settings to match your production URL

## Database Schema for Email Sending

The application uses the following database components for email functionality:

1. `auth.users` - Stores user authentication information
2. `auth.emails` - Used by Supabase to queue and send emails
3. `send_invitation_email` function - Custom function to send organization invitations
4. `check_email_configuration` function - Diagnostic function to check email settings

## Diagnostic Tools

The application includes diagnostic tools to help troubleshoot email issues:

1. **Email Configuration Check Button** - Available to admins on the Team Management page
   - Shows SMTP configuration status
   - Displays recent email sending attempts
   - Identifies common configuration issues

2. **Database Diagnostic Function** - `check_email_configuration()`
   - Can be called directly from SQL Editor for more detailed information
   - Logs configuration data to the Supabase logs

## Troubleshooting Common Issues

1. **"Error sending confirmation email"**:
   - Use the "Check Email Config" button to see the current configuration status
   - Verify SMTP settings in Supabase dashboard
   - Check if your email provider is blocking the sending
   - Check Supabase logs for specific error messages
   - Temporary workaround: The system will attempt to add users even if email sending fails

2. **Email server connection issues**:
   - Verify your SMTP server is accessible from Supabase's infrastructure
   - Some email providers block connections from cloud services
   - Try using a dedicated transactional email service like SendGrid, Mailgun, or Amazon SES

3. **Site URL configuration**:
   - In Supabase dashboard, go to Settings → API
   - Ensure the site URL is correctly set to your application's URL
   - For development: http://localhost:8080 (or your dev port)
   - For production: https://yourdomain.com

4. **Email templates**:
   - Check Authentication → Email Templates
   - Ensure all required templates (Confirmation, Invite, Magic Link, etc.) are properly configured

## Manual Email Testing

To manually test email functionality:

```sql
-- Call the diagnostic function
SELECT * FROM check_email_configuration();

-- Check the email queue
SELECT * FROM auth.emails ORDER BY created_at DESC LIMIT 10;

-- Manually send a test invitation
SELECT * FROM send_invitation_email(
  '<user_uuid>', 
  '<organization_uuid>', 
  TRUE
);
```

## Production vs Development Settings

In development:
- Consider using a testing email service like Mailtrap
- Set lower rate limits to avoid accidental spamming
- Use development-specific email templates

In production:
- Use a reliable email provider with high deliverability
- Set up proper SPF, DKIM, and DMARC records
- Monitor email sending stats regularly
- Consider setting up a dedicated email domain 