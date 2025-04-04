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

If emails are not being sent, check:
1. SMTP configuration in Supabase dashboard
2. Email provider restrictions or spam filters
3. Application logs for error messages
4. Email queue in `auth.emails` table

## Troubleshooting Common Issues

1. **"Error sending confirmation email"**:
   - Verify SMTP settings are correct
   - Check if your email provider is blocking the sending
   - Ensure the site URL is properly set

2. **Invitation emails not received**:
   - Check spam/junk folders
   - Verify email address is correct
   - Check if rate limits are exceeded on your email provider

3. **User sign-up errors**:
   - Ensure the redirect URL is properly set in authentication settings
   - Verify that the domain matches the site URL

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