export interface PostTheme {
  id: string;
  wp_post_url?: string | null;
  wp_sent_date?: string | null;
  content?: string | null;
  description?: string | null;
}

export const canSendToWordPress = (post: PostTheme, wpConfigured: boolean = false, isSendingToWP: boolean = false) => {
  const issues = [];
  
  if (!wpConfigured) {
    issues.push('WordPress not configured');
  }
  
  if (isSendingToWP) {
    issues.push('Already sending to WordPress');
  }
  
  if (post.wp_sent_date || post.wp_post_url) {
    issues.push('Already sent to WordPress');
  }
  
  if (!post.content && !post.description) {
    issues.push('No content to send');
  }
  
  return issues.length === 0;
}; 