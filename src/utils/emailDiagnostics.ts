import { supabase } from '@/integrations/supabase/client';

/**
 * Checks the email configuration and returns diagnostic information
 * This is useful for troubleshooting email sending issues
 */
export async function checkEmailConfiguration() {
  try {
    // Call the database function to check email configuration
    const { data, error } = await supabase.rpc('check_email_configuration');
    
    if (error) {
      console.error('Error checking email configuration:', error);
      return {
        success: false,
        error: error.message,
        details: null
      };
    }
    
    // Log results for debugging
    console.log('Email configuration check results:', data);
    
    // Analyze the results
    const smtpConfigured = data.smtp_configured;
    const siteUrl = data.site_url;
    const recentEmails = data.recent_emails || [];
    
    // Simple check for common issues
    const issues = [];
    
    if (!smtpConfigured) {
      issues.push('SMTP is not properly configured');
    }
    
    if (siteUrl === 'not set' || !siteUrl) {
      issues.push('Site URL is not properly set');
    }
    
    if (siteUrl && !siteUrl.startsWith('https')) {
      issues.push('Site URL should use HTTPS for secure email links');
    }
    
    const pendingEmails = recentEmails.filter(email => email.status === 'pending').length;
    if (pendingEmails > 0) {
      issues.push(`${pendingEmails} emails are pending delivery`);
    }
    
    return {
      success: true,
      issues: issues.length > 0 ? issues : null,
      details: data
    };
  } catch (error) {
    console.error('Error in checkEmailConfiguration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: null
    };
  }
} 